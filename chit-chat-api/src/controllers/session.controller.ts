import { Request, Response } from 'express';
import { Session } from '../models/session';
import { successResponse, errorResponse } from '../utils/response';
import { executePaginatedQuery } from '../utils/queryParser';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import logger from '../utils/logger';

// List sessions (For Admin Panel)
export const getSessionsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const populate = [
      { path: 'userId', select: 'email mobileNumber username displayName' },
      { path: 'adminId', select: 'email role' }
    ];
    const paginatedSessions = await executePaginatedQuery(Session, req.query, populate);
    successResponse(res, 200, SuccessMessages.SESSION.RETRIEVED, paginatedSessions);
  } catch (error) {
    logger.error(`Get Sessions Admin error: ${error}`);
    errorResponse(res, 500, ErrorMessages.SESSION.RETRIEVED_FAILED, error);
  }
};

// Revoke a session (For Admin Panel or User)
export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Find the session
    const session = await Session.findById(id);
    if (!session) {
      errorResponse(res, 404, ErrorMessages.AUTH.SESSION_NOT_FOUND);
      return;
    }

    // If it's a mobile user revoking, ensure they own the session
    if ((req as any).user && (req as any).user.role === 'user') {
      const currentUserId = (req as any).user.id;
      if (session.userId?.toString() !== currentUserId) {
        errorResponse(res, 403, ErrorMessages.AUTH.SESSION_REVOKE_UNAUTHORIZED);
        return;
      }
    }

    session.isActive = false;
    await session.save();

    successResponse(res, 200, SuccessMessages.SESSION.REVOKED);
  } catch (error) {
    logger.error(`Revoke Session error: ${error}`);
    errorResponse(res, 500, ErrorMessages.SESSION.REVOKED_FAILED, error);
  }
};

// List current user's active sessions (For Mobile User)
export const getMySessionsMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const query = {
      ...req.query,
      userId,
      isActive: true
    };
    const paginatedSessions = await executePaginatedQuery(Session, query, [], '-token');
    successResponse(res, 200, SuccessMessages.SESSION.MY_SESSIONS_RETRIEVED, paginatedSessions);
  } catch (error) {
    logger.error(`Get My Sessions Mobile error: ${error}`);
    errorResponse(res, 500, ErrorMessages.SESSION.RETRIEVED_FAILED, error);
  }
};

// Revoke all other sessions except current (For Mobile User)
export const revokeOtherSessionsMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const currentToken = req.header('Authorization')?.replace('Bearer ', '');

    if (!currentToken) {
      errorResponse(res, 400, ErrorMessages.AUTH.CURRENT_TOKEN_MISSING);
      return;
    }

    // Revoke all active sessions for this user except the current token
    const result = await Session.updateMany(
      { userId, token: { $ne: currentToken }, isActive: true },
      { $set: { isActive: false } }
    );

    successResponse(res, 200, SuccessMessages.SESSION.OTHER_REVOKED, {
      revokedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error(`Revoke Other Sessions Mobile error: ${error}`);
    errorResponse(res, 500, ErrorMessages.SESSION.REVOKED_FAILED, error);
  }
};
