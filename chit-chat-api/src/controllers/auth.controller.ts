import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { Session } from '../models/session';
import { generateAndSendOtp, verifyOtpCode, OtpVerifyResult } from '../services/otp.service';
import { successResponse, errorResponse } from '../utils/response';
import { ErrorMessages, SuccessMessages } from '../constants/errors';

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobileNumber, email } = req.body;
    if (!mobileNumber && !email) {
      errorResponse(res, 400, ErrorMessages.AUTH.MISSING_FIELDS);
      return;
    }
    let otpCode;
    if (email) {
      otpCode = await generateAndSendOtp(email, 'email');
    } else if (mobileNumber) {
      otpCode = await generateAndSendOtp(mobileNumber, 'mobile');
    }
    const data: any = {};
    successResponse(res, 200, SuccessMessages.AUTH.OTP_SENT, data);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.AUTH.OTP_SEND_FAILED, error);
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobileNumber, email, otp } = req.body;
    if (!mobileNumber && !email) {
      errorResponse(res, 400, ErrorMessages.AUTH.MISSING_FIELDS);
      return;
    }
    if (!otp) {
      errorResponse(res, 400, ErrorMessages.AUTH.MISSING_FIELDS);
      return;
    }

    const result: OtpVerifyResult = await verifyOtpCode(email || mobileNumber, otp);

    if (result.locked) {
      res.status(423).json({
        success: false,
        message: ErrorMessages.AUTH.OTP_LOCKED,
        attemptsLeft: 0,
        locked: true,
        lockedUntil: result.lockedUntil,
      });
      return;
    }

    if (!result.valid) {
      res.status(400).json({
        success: false,
        message: ErrorMessages.AUTH.INVALID_OTP,
        attemptsLeft: result.attemptsLeft,
        locked: false,
      });
      return;
    }

    // OTP valid — find or create user
    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) user = await User.create({ email });
    } else if (mobileNumber) {
      user = await User.findOne({ mobileNumber });
      if (!user) user = await User.create({ mobileNumber });
    }

    if (!user) {
      errorResponse(res, 500, ErrorMessages.AUTH.FAILED_USER_RESOLVE);
      return;
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET as string;
    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

    // Save user session in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    await Session.create({
      userId: user._id,
      userType: 'user',
      token,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
      isActive: true,
      expiresAt
    });

    successResponse(res, 200, SuccessMessages.AUTH.OTP_VERIFIED, { token, user });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.AUTH.OTP_VERIFY_FAILED, error);
  }
};

import bcrypt from 'bcryptjs';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      errorResponse(res, 404, ErrorMessages.AUTH.USER_NOT_FOUND);
      return;
    }
    successResponse(res, 200, SuccessMessages.AUTH.PROFILE_FETCHED, { user });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.SYSTEM.SERVER_ERROR, error);
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const updateData = { ...req.body };
    
    // Remove empty values for fields with unique/sparse/minlength constraints
    const sparseFields = ['username', 'email', 'mobileNumber'];
    sparseFields.forEach(field => {
      if (updateData[field] === '' || updateData[field] === null || updateData[field] === undefined) {
        delete updateData[field];
      }
    });

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const user = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { returnDocument: 'after', runValidators: true }
    );
    if (!user) {
      errorResponse(res, 404, ErrorMessages.AUTH.USER_NOT_FOUND);
      return;
    }

    // Broadcast profile change to ALL connected clients so contact lists/DPs update live
    const io = req.app.get('io');
    if (io) {
      io.emit('userProfileUpdated', {
        userId: user._id.toString(),
        displayName: user.displayName,
        profileImage: user.profileImage || null,
        username: user.username || null,
      });
    }

    successResponse(res, 200, SuccessMessages.AUTH.PROFILE_UPDATED, { user });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.AUTH.PROFILE_UPDATE_FAILED, error);
  }
};

export const loginWithPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      errorResponse(res, 400, ErrorMessages.AUTH.MISSING_FIELDS);
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      errorResponse(res, 400, ErrorMessages.AUTH.INVALID_CREDENTIALS);
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      errorResponse(res, 400, ErrorMessages.AUTH.INVALID_CREDENTIALS);
      return;
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET as string;
    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

    // Save session in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await Session.create({
      userId: user._id,
      userType: 'user',
      token,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
      isActive: true,
      expiresAt
    });

    successResponse(res, 200, SuccessMessages.AUTH.LOGIN_SUCCESS, { token, user });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.SYSTEM.SERVER_ERROR, error);
  }
};

export const checkUsernameAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const username = req.params.username as string;
    const currentUserId = (req as any).user.id;

    if (!username || username.trim().length < 3) {
      errorResponse(res, 400, ErrorMessages.AUTH.USERNAME_TOO_SHORT);
      return;
    }

    // Check if any other user has this username (case-insensitive)
    const existingUser = await User.findOne({ 
      username: new RegExp(`^${username.trim()}$`, 'i'),
      _id: { $ne: currentUserId }
    });

    if (existingUser) {
      successResponse(res, 200, SuccessMessages.AUTH.USERNAME_TAKEN, { available: false });
    } else {
      successResponse(res, 200, SuccessMessages.AUTH.USERNAME_AVAILABLE, { available: true });
    }
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.AUTH.USERNAME_CHECK_FAILED, error);
  }
};

export const updatePushToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { pushToken } = req.body;

    if (!pushToken) {
      errorResponse(res, 400, 'Push token is required', {});
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { pushToken },
      { new: true }
    );

    if (!updatedUser) {
      errorResponse(res, 404, ErrorMessages.AUTH.USER_NOT_FOUND, {});
      return;
    }

    successResponse(res, 200, 'Push token updated successfully', { user: updatedUser });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.SYSTEM.SERVER_ERROR, error);
  }
};
