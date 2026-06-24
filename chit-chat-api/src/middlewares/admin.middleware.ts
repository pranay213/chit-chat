import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/response';
import { AdminRole } from '../constants/roles';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    errorResponse(res, 401, 'No token, authorization denied');
    return;
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    errorResponse(res, 401, 'Token is not valid');
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === AdminRole.SUPER_ADMIN) {
    next();
  } else {
    errorResponse(res, 403, 'Access denied. Super Admin role required.');
  }
};
