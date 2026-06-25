import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/admin';
import { Session } from '../models/session';
import { AdminRole } from '../constants/roles';
import { successResponse, errorResponse } from '../utils/response';
import { executePaginatedQuery } from '../utils/queryParser';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import logger from '../utils/logger';
import { LoggerMessages } from "../constants/loggerMessages";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || !admin.isActive) {
      errorResponse(res, 401, ErrorMessages.AUTH.INACTIVE_ACCOUNT);
      return;
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      errorResponse(res, 401, ErrorMessages.AUTH.INVALID_CREDENTIALS);
      return;
    }

    const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '1d' });
    
    // Create session tracking in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiry matching token

    await Session.create({
      adminId: admin._id,
      userType: 'admin',
      token,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
      isActive: true,
      expiresAt
    });

    const adminData = admin.toObject();
    delete (adminData as any).passwordHash;

    successResponse(res, 200, SuccessMessages.AUTH.LOGIN_SUCCESS, { token, admin: adminData });
  } catch (error) {
    logger.error(LoggerMessages.LOGIN_ERROR(error));
    errorResponse(res, 500, ErrorMessages.ADMIN.LOGIN_FAILED, error);
  }
};

export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      errorResponse(res, 400, ErrorMessages.AUTH.ADMIN_EXISTS);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = await Admin.create({
      email,
      passwordHash,
      role: role || AdminRole.ADMIN,
      isActive: true
    });

    const adminData = newAdmin.toObject();
    delete (adminData as any).passwordHash;

    successResponse(res, 201, SuccessMessages.ADMIN.CREATED, { admin: adminData });
  } catch (error) {
    logger.error(LoggerMessages.CREATE_ADMIN_ERROR(error));
    errorResponse(res, 500, ErrorMessages.ADMIN.CREATED_FAILED, error);
  }
};

export const getAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const paginatedAdmins = await executePaginatedQuery(Admin, req.query, [], '-passwordHash');
    successResponse(res, 200, SuccessMessages.ADMIN.RETRIEVED, paginatedAdmins);
  } catch (error) {
    logger.error(LoggerMessages.GET_ADMINS_ERROR(error));
    errorResponse(res, 500, ErrorMessages.ADMIN.RETRIEVED_FAILED, error);
  }
};

export const updateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, isActive, password } = req.body;

    const updateData: any = {};
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const admin = await Admin.findByIdAndUpdate(id, updateData, { new: true }).select('-passwordHash');
    
    if (!admin) {
      errorResponse(res, 404, ErrorMessages.ADMIN.NOT_FOUND);
      return;
    }

    successResponse(res, 200, SuccessMessages.ADMIN.UPDATED, { admin });
  } catch (error) {
    logger.error(LoggerMessages.UPDATE_ADMIN_ERROR(error));
    errorResponse(res, 500, ErrorMessages.ADMIN.UPDATED_FAILED, error);
  }
};

export const deleteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      errorResponse(res, 404, ErrorMessages.ADMIN.NOT_FOUND);
      return;
    }

    successResponse(res, 200, SuccessMessages.ADMIN.DELETED);
  } catch (error) {
    logger.error(LoggerMessages.DELETE_ADMIN_ERROR(error));
    errorResponse(res, 500, ErrorMessages.ADMIN.DELETED_FAILED, error);
  }
};
