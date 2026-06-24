import { Request, Response } from 'express';
import { Session } from '../models/session';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../utils/logger';

// List sessions (For Admin Panel)
export const getSessionsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userType, userId, adminId, isActive } = req.query;
    
    const query: any = {};
    if (userType) query.userType = userType;
    if (userId) query.userId = userId;
    if (adminId) query.adminId = adminId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sessions = await Session.find(query)
      .populate('userId', 'email mobileNumber username displayName')
      .populate('adminId', 'email role')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'Sessions retrieved successfully', { sessions });
  } catch (error) {
    logger.error(`Get Sessions Admin error: ${error}`);
    errorResponse(res, 500, 'Failed to fetch sessions', error);
  }
};

// Revoke a session (For Admin Panel or User)
export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Find the session
    const session = await Session.findById(id);
    if (!session) {
      errorResponse(res, 404, 'Session not found');
      return;
    }

    // If it's a mobile user revoking, ensure they own the session
    if ((req as any).user && (req as any).user.role === 'user') {
      const currentUserId = (req as any).user.id;
      if (session.userId?.toString() !== currentUserId) {
        errorResponse(res, 403, 'Unauthorized to revoke this session');
        return;
      }
    }

    session.isActive = false;
    await session.save();

    successResponse(res, 200, 'Session revoked successfully');
  } catch (error) {
    logger.error(`Revoke Session error: ${error}`);
    errorResponse(res, 500, 'Failed to revoke session', error);
  }
};

// List current user's active sessions (For Mobile User)
export const getMySessionsMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    
    const sessions = await Session.find({ userId, isActive: true })
      .select('-token') // Do not return the actual token for safety
      .sort({ updatedAt: -1 });

    successResponse(res, 200, 'Your active sessions retrieved successfully', { sessions });
  } catch (error) {
    logger.error(`Get My Sessions Mobile error: ${error}`);
    errorResponse(res, 500, 'Failed to fetch your sessions', error);
  }
};

// Revoke all other sessions except current (For Mobile User)
export const revokeOtherSessionsMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const currentToken = req.header('Authorization')?.replace('Bearer ', '');

    if (!currentToken) {
      errorResponse(res, 400, 'Current authorization token not found');
      return;
    }

    // Revoke all active sessions for this user except the current token
    const result = await Session.updateMany(
      { userId, token: { $ne: currentToken }, isActive: true },
      { $set: { isActive: false } }
    );

    successResponse(res, 200, 'All other sessions revoked successfully', {
      revokedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error(`Revoke Other Sessions Mobile error: ${error}`);
    errorResponse(res, 500, 'Failed to revoke other sessions', error);
  }
};
