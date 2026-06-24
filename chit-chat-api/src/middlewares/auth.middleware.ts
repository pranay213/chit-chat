import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/response';
import { Session } from '../models/session';
import { ErrorMessages } from '../constants/errors';

export interface UserAuthRequest extends Request {
  user?: any;
}

export const authenticateUser = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    errorResponse(res, 401, ErrorMessages.AUTH.TOKEN_NOT_PROVIDED);
    return;
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify session in DB
    const session = await Session.findOne({ token, isActive: true });
    if (!session) {
      errorResponse(res, 401, ErrorMessages.AUTH.SESSION_INACTIVE);
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    errorResponse(res, 401, ErrorMessages.AUTH.INVALID_TOKEN);
  }
};
