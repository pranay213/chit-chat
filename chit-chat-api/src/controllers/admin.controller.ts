import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/admin';
import { Session } from '../models/session';
import { AdminRole } from '../constants/roles';
import { successResponse, errorResponse } from '../utils/response';
import { executePaginatedQuery } from '../utils/queryParser';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || !admin.isActive) {
      errorResponse(res, 401, 'Invalid credentials or inactive account');
      return;
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      errorResponse(res, 401, 'Invalid credentials');
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

    successResponse(res, 200, 'Login successful', { token, admin: adminData });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    errorResponse(res, 500, 'Server Error during login', error);
  }
};

export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      errorResponse(res, 400, 'Admin with this email already exists');
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

    successResponse(res, 201, 'Admin created successfully', { admin: adminData });
  } catch (error) {
    logger.error(`Create Admin error: ${error}`);
    errorResponse(res, 500, 'Failed to create admin', error);
  }
};

export const getAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const paginatedAdmins = await executePaginatedQuery(Admin, req.query, [], '-passwordHash');
    successResponse(res, 200, 'Admins retrieved successfully', paginatedAdmins);
  } catch (error) {
    logger.error(`Get Admins error: ${error}`);
    errorResponse(res, 500, 'Failed to fetch admins', error);
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
      errorResponse(res, 404, 'Admin not found');
      return;
    }

    successResponse(res, 200, 'Admin updated successfully', { admin });
  } catch (error) {
    logger.error(`Update Admin error: ${error}`);
    errorResponse(res, 500, 'Failed to update admin', error);
  }
};

export const deleteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      errorResponse(res, 404, 'Admin not found');
      return;
    }

    successResponse(res, 200, 'Admin deleted successfully');
  } catch (error) {
    logger.error(`Delete Admin error: ${error}`);
    errorResponse(res, 500, 'Failed to delete admin', error);
  }
};
