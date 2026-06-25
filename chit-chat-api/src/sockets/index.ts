import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { Message } from '../models/message';
import { Chat } from '../models/chat';
import { Session } from '../models/session';
import { SocketEvents } from '../constants/socketEvents';
import { ErrorMessages } from '../constants/errors';
import logger from '../utils/logger';
import { generateOllamaResponse } from '../services/ollama.service';
import { LoggerMessages } from "../constants/loggerMessages";
import { sendPushNotification } from '../services/push.service';

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
      logger.error(LoggerMessages.SOCKET_AUTH_ERROR(err));
      return next(new Error(ErrorMessages.AUTH.INVALID_CREDENTIALS));
    }
  });

  io.on(SocketEvents.CONNECTION, (socket: Socket) => {
    const userId = socket.data.user.id;
    logger.info(LoggerMessages.USER_CONNECTED_TO_SOCKET_SOCKET(userId, socket.id));

    // Add to active online users registry
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Update user online status in database (background execution)
    User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() }).exec()
      .catch(err => logger.error(LoggerMessages.ERROR_UPDATING_USER_ONLINE_STATUS(err)));

    // Broadcast online status to other users
    socket.broadcast.emit(SocketEvents.USER_STATUS_UPDATE, { userId, status: 'online' });

    // Join Chat Rooms
    socket.on(SocketEvents.JOIN_CHAT, (chatId: string) => {
      socket.join(`chat:${chatId}`);
      logger.info(LoggerMessages.USER_JOINED_ROOM_CHAT(userId, chatId));
    });

    // Leave Chat Rooms
    socket.on(SocketEvents.LEAVE_CHAT, (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      logger.info(LoggerMessages.USER_LEFT_ROOM_CHAT(userId, chatId));
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
          createdAt: message.createdAt || new Date(),
          updatedAt: message.updatedAt || new Date()
        };

        // 3. Broadcast message instantly to all users in the room (including sender)
        io.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE, populatedMessage);

        // 4. Save to DB and update Chat document in parallel background threads (non-blocking)
        Promise.all([
          message.save(),
          Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, updatedAt: new Date() }).exec()
        ]).then(async () => {
          // --- Auto-reply Bot for 8125695499 ---
          try {
            const chat = await Chat.findById(chatId).lean();
            if (!chat) return;
            // Find if 8125695499 is in the participants (excluding the sender)
            const botUser = await User.findOne({ mobileNumber: '8125695499' }).lean();
            if (botUser) {
              const botId = botUser._id.toString();
              const participants = (chat.participants as any[]).map((p: any) => p.toString());
              if (participants.includes(botId) && userId !== botId) {
                const replies = [
                  `Hey! Got your message: "${text || '...'}" 👋`,
                  `Thanks for reaching out! How can I help you today?`,
                  `Interesting! Tell me more... 🤔`,
                  `Hi! I'm 8125695499's bot. "${text}" noted!`,
                  `Roger that! "${text}" — I'll get back to you shortly.`,
                  `Sure thing! Let me check on that for you.`,
                ];
                const replyText = replies[Math.floor(Math.random() * replies.length)];

                // Wait 1–2 seconds before auto-reply for realism
                await new Promise(res => setTimeout(res, 1000 + Math.random() * 1000));

                const replyMsg = new Message({
                  chatId,
                  senderId: botId,
                  text: replyText,
                  readBy: [botId],
                  deliveredTo: [botId]
                });
                await replyMsg.save();
                await Chat.findByIdAndUpdate(chatId, { lastMessage: replyMsg._id, updatedAt: new Date() }).exec();

                const replyPayload = {
                  _id: replyMsg._id,
                  chatId: replyMsg.chatId,
                  senderId: {
                    _id: botId,
                    displayName: botUser.displayName || '8125695499',
                    profileImage: (botUser as any).profileImage || ''
                  },
                  text: replyText,
                  readBy: replyMsg.readBy,
                  deliveredTo: replyMsg.deliveredTo,
                  createdAt: replyMsg.createdAt || new Date(),
                  updatedAt: replyMsg.updatedAt || new Date()
                };
                io.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE, replyPayload);
              }
            }
          } catch (botErr) {
            logger.error(LoggerMessages.AUTO_REPLY_BOT_ERROR(botErr));
          }

          // --- Ollama AI Chatbot for 9999999999 ---
          try {
            const chat = await Chat.findById(chatId).lean();
            if (!chat) return;
            const ollamaUser = await User.findOne({ mobileNumber: '9999999999' }).lean();
            if (ollamaUser) {
              const botId = ollamaUser._id.toString();
              const participants = (chat.participants as any[]).map((p: any) => p.toString());
              if (participants.includes(botId) && userId !== botId) {
                // Emit typing indicator
                io.to(`chat:${chatId}`).emit(SocketEvents.TYPING, { chatId, userId: botId });

                // Fetch context of the last 10 messages
                const prevMsgs = await Message.find({ chatId })
                  .sort({ createdAt: -1 })
                  .limit(10)
                  .lean();
                
                // Format for Ollama
                const messagesList: any[] = prevMsgs.reverse().map((m: any) => ({
                  role: m.senderId.toString() === botId ? 'assistant' : 'user',
                  content: m.text || '',
                }));

                // Get response from Ollama
                const replyText = await generateOllamaResponse(messagesList);

                // Stop typing indicator
                io.to(`chat:${chatId}`).emit(SocketEvents.STOP_TYPING, { chatId, userId: botId });

                const replyMsg = new Message({
                  chatId,
                  senderId: botId,
                  text: replyText,
                  readBy: [botId],
                  deliveredTo: [botId]
                });
                await replyMsg.save();
                await Chat.findByIdAndUpdate(chatId, { lastMessage: replyMsg._id, updatedAt: new Date() }).exec();

                const replyPayload = {
                  _id: replyMsg._id,
                  chatId: replyMsg.chatId,
                  senderId: {
                    _id: botId,
                    displayName: ollamaUser.displayName || 'Ollama AI Bot',
                    profileImage: ollamaUser.profileImage || ''
                  },
                  text: replyText,
                  readBy: replyMsg.readBy,
                  deliveredTo: replyMsg.deliveredTo,
                  createdAt: replyMsg.createdAt || new Date(),
                  updatedAt: replyMsg.updatedAt || new Date()
                };
                io.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE, replyPayload);
              }
            }
          } catch (ollamaErr) {
            logger.error(LoggerMessages.OLLAMA_CHATBOT_ERROR(ollamaErr));
          }

          // --- Push Notifications ---
          try {
            const chat = await Chat.findById(chatId).populate('participants', 'pushToken').lean();
            if (chat) {
              const tokens = (chat.participants as any[])
                .filter(p => p._id.toString() !== userId && p.pushToken)
                .map(p => p.pushToken);

              if (tokens.length > 0) {
                let bodyStr = text || 'New message';
                if (attachments && attachments.length > 0) {
                  bodyStr = attachments[0].type === 'image' ? '📷 Photo' : '📎 Attachment';
                }

                await sendPushNotification({
                  to: tokens,
                  title: chat.isGroup ? `${socket.data.userProfile?.displayName || 'User'} in ${chat.groupName}` : socket.data.userProfile?.displayName || 'User',
                  body: bodyStr,
                  categoryId: 'CHAT_MESSAGE',
                  data: {
                    chatId,
                    senderId: userId,
                  }
                });
              }
            }
          } catch (pushErr) {
            logger.error(`Failed to trigger push notification: ${pushErr}`);
          }
        }).catch(err => logger.error(LoggerMessages.ERROR_PERSISTING_MESSAGE_CHAT_STATUS(err)));

        // 5. Acknowledge delivery to sender
        if (callback) callback({ success: true, message: populatedMessage });
      } catch (error) {
        logger.error(LoggerMessages.SOCKET_SENDMESSAGE_ERROR(error));
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

    // Location Sharing
    socket.on('locationUpdate', (payload: { chatId: string; lat: number; lng: number; userId: string }) => {
      const { chatId, lat, lng, userId: senderId } = payload;
      // Broadcast live location to other participants
      socket.to(`chat:${chatId}`).emit('locationUpdate', { chatId, lat, lng, userId: senderId });
    });

    socket.on('locationStopped', (payload: { chatId: string; userId: string }) => {
      const { chatId, userId: senderId } = payload;
      socket.to(`chat:${chatId}`).emit('locationStopped', { chatId, userId: senderId });
    });

    // Message Status Update Events (Read / Delivered acknowledgments)
    socket.on(SocketEvents.MESSAGE_READ, (payload: { chatId: string; messageId: string }) => {
      const { chatId, messageId } = payload;
      
      // Update read status in database background
      Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } }).exec()
        .catch(err => logger.error(LoggerMessages.ERROR_UPDATING_MESSAGE_READ_STATUS(err)));

      // Broadcast acknowledgment
      socket.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE_READ, { chatId, messageId, userId });
    });

    socket.on(SocketEvents.MESSAGE_DELIVERED, (payload: { chatId: string; messageId: string }) => {
      const { chatId, messageId } = payload;

      // Update delivery status in database background
      Message.findByIdAndUpdate(messageId, { $addToSet: { deliveredTo: userId } }).exec()
        .catch(err => logger.error(LoggerMessages.ERROR_UPDATING_MESSAGE_DELIVERY_STATUS(err)));

      // Broadcast acknowledgment
      socket.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE_DELIVERED, { chatId, messageId, userId });
    });

    // WebRTC Video Call Signaling
    socket.on(SocketEvents.CALL_USER, (payload: { userToCall: string, signalData: any, from: string, name: string }) => {
      const { userToCall, signalData, from, name } = payload;
      const targetSockets = onlineUsers.get(userToCall);
      if (targetSockets) {
        targetSockets.forEach(socketId => {
          io.to(socketId).emit(SocketEvents.INCOMING_CALL, { signal: signalData, from, name });
        });
      }
    });

    socket.on(SocketEvents.ANSWER_CALL, (payload: { to: string, signal: any }) => {
      const { to, signal } = payload;
      const targetSockets = onlineUsers.get(to);
      if (targetSockets) {
        targetSockets.forEach(socketId => {
          io.to(socketId).emit(SocketEvents.CALL_ACCEPTED, signal);
        });
      }
    });

    socket.on(SocketEvents.REJECT_CALL, (payload: { to: string }) => {
      const { to } = payload;
      const targetSockets = onlineUsers.get(to);
      if (targetSockets) {
        targetSockets.forEach(socketId => {
          io.to(socketId).emit(SocketEvents.CALL_REJECTED);
        });
      }
    });

    socket.on(SocketEvents.END_CALL, (payload: { to: string }) => {
      const { to } = payload;
      const targetSockets = onlineUsers.get(to);
      if (targetSockets) {
        targetSockets.forEach(socketId => {
          io.to(socketId).emit(SocketEvents.CALL_ENDED);
        });
      }
    });

    socket.on(SocketEvents.WEBRTC_ICE_CANDIDATE, (payload: { to: string, candidate: any }) => {
      const { to, candidate } = payload;
      const targetSockets = onlineUsers.get(to);
      if (targetSockets) {
        targetSockets.forEach(socketId => {
          io.to(socketId).emit(SocketEvents.WEBRTC_ICE_CANDIDATE, { candidate });
        });
      }
    });

    // Disconnect Event Handler
    socket.on(SocketEvents.DISCONNECT, () => {
      logger.info(LoggerMessages.USER_DISCONNECTED_FROM_SOCKET_SOCKET(userId, socket.id));
      
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          
          // User is fully offline on all devices. Update status in database.
          User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() }).exec()
            .catch(err => logger.error(LoggerMessages.ERROR_UPDATING_USER_OFFLINE_STATUS(err)));

          // Broadcast offline state update
          socket.broadcast.emit(SocketEvents.USER_STATUS_UPDATE, { userId, status: 'offline', lastSeen: new Date() });
        }
      }
    });
  });
};
