import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { Message } from '../models/message';
import { Chat } from '../models/chat';
import { Session } from '../models/session';
import { SocketEvents } from '../constants/socketEvents';
import { ErrorMessages } from '../constants/errors';
import logger from '../utils/logger';

// In-memory active connections mapping (userId -> Set of active socketIds)
const onlineUsers = new Map<string, Set<string>>();

export const setupSockets = (io: Server) => {
  // Authentication Middleware for Socket.io Connections
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error(ErrorMessages.AUTH.TOKEN_NOT_PROVIDED));
      }

      const JWT_SECRET = process.env.JWT_SECRET as string;
      const decoded: any = jwt.verify(token as string, JWT_SECRET);

      // Validate session is active in database (lean query for performance)
      const session = await Session.findOne({ token, isActive: true }).lean();
      if (!session) {
        return next(new Error(ErrorMessages.AUTH.SESSION_INACTIVE));
      }

      // Pre-load user profile details to eliminate DB lookups during chat message broadcast
      const userProfile = await User.findById(decoded.id).select('displayName profileImage').lean();

      socket.data.user = decoded; // { id, role }
      socket.data.userProfile = userProfile;
      next();
    } catch (err) {
      logger.error(`Socket auth error: ${err}`);
      return next(new Error(ErrorMessages.AUTH.INVALID_CREDENTIALS));
    }
  });

  io.on(SocketEvents.CONNECTION, (socket: Socket) => {
    const userId = socket.data.user.id;
    logger.info(`User connected to socket: ${userId} (Socket: ${socket.id})`);

    // Add to active online users registry
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Update user online status in database (background execution)
    User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() }).exec()
      .catch(err => logger.error(`Error updating user online status: ${err}`));

    // Broadcast online status to other users
    socket.broadcast.emit(SocketEvents.USER_STATUS_UPDATE, { userId, status: 'online' });

    // Join Chat Rooms
    socket.on(SocketEvents.JOIN_CHAT, (chatId: string) => {
      socket.join(`chat:${chatId}`);
      logger.info(`User ${userId} joined room chat:${chatId}`);
    });

    // Leave Chat Rooms
    socket.on(SocketEvents.LEAVE_CHAT, (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      logger.info(`User ${userId} left room chat:${chatId}`);
    });

    // Send Message Event (OPTIMIZED - Broadcasts instantly, persists in background)
    socket.on(SocketEvents.SEND_MESSAGE, async (payload: { chatId: string; text?: string; attachments?: any[] }, callback) => {
      try {
        const { chatId, text, attachments } = payload;

        if (!chatId) {
          if (callback) callback({ success: false, error: ErrorMessages.CHAT.CHAT_ID_REQUIRED });
          return;
        }

        // 1. Instantiate the Mongoose document in memory to generate the MongoDB _id immediately
        const message = new Message({
          chatId,
          senderId: userId,
          text,
          attachments,
          readBy: [userId],
          deliveredTo: [userId]
        });

        // 2. Construct populated message payload in-memory (0ms database read latency)
        const populatedMessage = {
          _id: message._id,
          chatId: message.chatId,
          senderId: {
            _id: userId,
            displayName: socket.data.userProfile?.displayName || 'User',
            profileImage: socket.data.userProfile?.profileImage || ''
          },
          text: message.text,
          attachments: message.attachments,
          readBy: message.readBy,
          deliveredTo: message.deliveredTo,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        };

        // 3. Broadcast message instantly to all users in the room (including sender)
        io.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE, populatedMessage);

        // 4. Save to DB and update Chat document in parallel background threads (non-blocking)
        Promise.all([
          message.save(),
          Chat.findByIdAndUpdate(chatId, { lastMessage: message._id }).exec()
        ]).catch(err => logger.error(`Error persisting message/chat status: ${err}`));

        // 5. Acknowledge delivery to sender
        if (callback) callback({ success: true, message: populatedMessage });
      } catch (error) {
        logger.error(`Socket sendMessage error: ${error}`);
        if (callback) callback({ success: false, error: ErrorMessages.SYSTEM.SERVER_ERROR });
      }
    });

    // Typing Indicators
    socket.on(SocketEvents.TYPING, (chatId: string) => {
      socket.to(`chat:${chatId}`).emit(SocketEvents.TYPING, { chatId, userId });
    });

    socket.on(SocketEvents.STOP_TYPING, (chatId: string) => {
      socket.to(`chat:${chatId}`).emit(SocketEvents.STOP_TYPING, { chatId, userId });
    });

    // Message Status Update Events (Read / Delivered acknowledgments)
    socket.on(SocketEvents.MESSAGE_READ, (payload: { chatId: string; messageId: string }) => {
      const { chatId, messageId } = payload;
      
      // Update read status in database background
      Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } }).exec()
        .catch(err => logger.error(`Error updating message read status: ${err}`));

      // Broadcast acknowledgment
      socket.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE_READ, { chatId, messageId, userId });
    });

    socket.on(SocketEvents.MESSAGE_DELIVERED, (payload: { chatId: string; messageId: string }) => {
      const { chatId, messageId } = payload;

      // Update delivery status in database background
      Message.findByIdAndUpdate(messageId, { $addToSet: { deliveredTo: userId } }).exec()
        .catch(err => logger.error(`Error updating message delivery status: ${err}`));

      // Broadcast acknowledgment
      socket.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE_DELIVERED, { chatId, messageId, userId });
    });

    // Disconnect Event Handler
    socket.on(SocketEvents.DISCONNECT, () => {
      logger.info(`User disconnected from socket: ${userId} (Socket: ${socket.id})`);
      
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          
          // User is fully offline on all devices. Update status in database.
          User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() }).exec()
            .catch(err => logger.error(`Error updating user offline status: ${err}`));

          // Broadcast offline state update
          socket.broadcast.emit(SocketEvents.USER_STATUS_UPDATE, { userId, status: 'offline', lastSeen: new Date() });
        }
      }
    });
  });
};
