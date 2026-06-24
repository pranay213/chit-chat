import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/response';
import { AdminRole } from '../constants/roles';
import { Role } from '../models/role';

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
  if (req.user && (req.user.role === AdminRole.SUPER_ADMIN || req.user.role === AdminRole.DEVELOPER)) {
    next();
  } else {
    errorResponse(res, 403, 'Access denied. Super Admin or Developer role required.');
  }
};

export const checkPermission = (moduleName: string, action: 'create' | 'read' | 'update' | 'delete') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 401, 'Unauthorized');
        return;
      }

      if (req.user.role === AdminRole.SUPER_ADMIN || req.user.role === AdminRole.DEVELOPER) {
        return next();
      }

      const roleDoc = await Role.findOne({ name: req.user.role });
      if (!roleDoc) {
        errorResponse(res, 403, 'Access denied. Role not found.');
        return;
      }

      const permission = roleDoc.permissions.find(p => p.module === moduleName);
      if (permission && permission.actions.includes(action)) {
        return next();
      }

      errorResponse(res, 403, `Access denied. Missing '${action}' permission for '${moduleName}' module.`);
    } catch (error) {
      errorResponse(res, 500, 'Error checking permissions', error);
    }
  };
};
