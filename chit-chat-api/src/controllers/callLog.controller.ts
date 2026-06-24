import { Response } from 'express';
import { CallLog } from '../models/callLog';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../utils/logger';

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
      errorResponse(res, 401, 'UNAUTHORIZED');
      return;
    }

    const logs = await CallLog.find({
      $or: [{ callerId: userId }, { receiverId: userId }]
    })
      .populate('callerId', 'displayName mobileNumber profileImage')
      .populate('receiverId', 'displayName mobileNumber profileImage')
      .sort({ createdAt: -1 })
      .limit(100);

    successResponse(res, 200, 'CALL_LOGS_RETRIEVED', { logs });
  } catch (error) {
    logger.error(`Get Call Logs error: ${error}`);
    errorResponse(res, 500, 'SERVER_ERROR', error);
  }
};

export const createCallLog = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      errorResponse(res, 401, 'UNAUTHORIZED');
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

    successResponse(res, 201, 'CALL_LOG_CREATED', { log: populatedLog });
  } catch (error) {
    logger.error(`Create Call Log error: ${error}`);
    errorResponse(res, 500, 'SERVER_ERROR', error);
  }
};
