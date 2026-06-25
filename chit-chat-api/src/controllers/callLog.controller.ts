import { Response } from 'express';
import { CallLog } from '../models/callLog';
import { Message } from '../models/message';
import { Chat } from '../models/chat';
import { successResponse, errorResponse } from '../utils/response';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import logger from '../utils/logger';
import { LoggerMessages } from "../constants/loggerMessages";

// Custom request interface with user context from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
  query: any;
}

export const getCallLogs = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      errorResponse(res, 401, ErrorMessages.AUTH.UNAUTHORIZED);
      return;
    }

    const logs = await CallLog.find({
      $or: [{ callerId: userId }, { receiverId: userId }]
    })
      .populate('callerId', 'displayName mobileNumber profileImage')
      .populate('receiverId', 'displayName mobileNumber profileImage')
      .sort({ createdAt: -1 })
      .limit(100);

    successResponse(res, 200, SuccessMessages.CALL_LOG.RETRIEVED, { logs });
  } catch (error) {
    logger.error(LoggerMessages.GET_CALL_LOGS_ERROR(error));
    errorResponse(res, 500, ErrorMessages.SYSTEM.SERVER_ERROR, error);
  }
};

export const createCallLog = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      errorResponse(res, 401, ErrorMessages.AUTH.UNAUTHORIZED);
      return;
    }

    const { receiverId, chatId, type, status, duration } = req.body;

    const newLog = await CallLog.create({
      callerId: userId,
      receiverId,
      chatId,
      type,
      status,
      duration: duration || 0
    });

    const populatedLog = await CallLog.findById(newLog._id)
      .populate('callerId', 'displayName mobileNumber profileImage')
      .populate('receiverId', 'displayName mobileNumber profileImage');

    // Create a special message in the chat to log this call
    if (chatId && populatedLog) {
      const messageText = `CALL_LOG:${type}|${status}|${duration || 0}`;
      const callMessage = await Message.create({
        chatId,
        senderId: userId,
        text: messageText,
        readBy: [userId],
        deliveredTo: [userId]
      });

      // Update Chat's lastMessage
      await Chat.findByIdAndUpdate(chatId, { lastMessage: callMessage._id, updatedAt: new Date() }).exec();

      // Broadcast the message via Socket.IO if available
      const io = req.app?.get('io');
      if (io) {
        const populatedMessage = {
          _id: callMessage._id,
          chatId: callMessage.chatId,
          senderId: {
            _id: userId,
            displayName: (populatedLog.callerId as any).displayName || 'User',
            profileImage: (populatedLog.callerId as any).profileImage || ''
          },
          text: callMessage.text,
          attachments: callMessage.attachments || [],
          readBy: callMessage.readBy,
          deliveredTo: callMessage.deliveredTo,
          createdAt: callMessage.createdAt,
          updatedAt: callMessage.updatedAt
        };
        io.to(`chat:${chatId}`).emit('message', populatedMessage);
      }
    }

    successResponse(res, 201, SuccessMessages.CALL_LOG.CREATED, { log: populatedLog });
  } catch (error) {
    logger.error(LoggerMessages.CREATE_CALL_LOG_ERROR(error));
    errorResponse(res, 500, ErrorMessages.SYSTEM.SERVER_ERROR, error);
  }
};
