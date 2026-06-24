import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { Session } from '../models/session';
import { generateAndSendOtp, verifyOtpCode } from '../services/otp.service';
import { successResponse, errorResponse } from '../utils/response';

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobileNumber, email } = req.body;
    if (!mobileNumber && !email) {
      errorResponse(res, 400, 'Please provide email or mobileNumber');
      return;
    }
    let otpCode;
    if (email) {
      otpCode = await generateAndSendOtp(email, 'email');
    } else if (mobileNumber) {
      otpCode = await generateAndSendOtp(mobileNumber, 'mobile');
    }
    const data: any = {};
    if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
      data.mockOtp = otpCode; // Send back for easy testing
    }
    successResponse(res, 200, 'OTP sent successfully', data);
  } catch (error) {
    errorResponse(res, 500, 'Failed to send OTP', error);
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobileNumber, email, otp } = req.body;
    let isOtpValid = false;
    if (!mobileNumber && !email) {
      errorResponse(res, 400, 'Please provide email or mobileNumber');
      return;
    }
    if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
      if (otp === process.env.MOCK_OTP) {
        isOtpValid = true;
      } else {
        isOtpValid = await verifyOtpCode(email || mobileNumber, otp);
      }
    } else {
      isOtpValid = await verifyOtpCode(email || mobileNumber, otp);
    }
    if (isOtpValid) {
      let user;
      if (email) {
        user = await User.findOne({ email });
        if (!user) user = await User.create({ email });
      } else if (mobileNumber) {
        user = await User.findOne({ mobileNumber });
        if (!user) user = await User.create({ mobileNumber });
      }

      if (!user) {
        errorResponse(res, 500, 'Failed to resolve user account');
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

      successResponse(res, 200, 'OTP verified successfully', { token, user });
    } else {
      errorResponse(res, 400, 'Invalid OTP');
    }
  } catch (error) {
    errorResponse(res, 500, 'Failed to verify OTP', error);
  }
};
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params; // Or get from JWT auth middleware
    const updateData = req.body; // email, gender, username, displayName, profileImage, slogan
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    if (!user) {
      errorResponse(res, 404, 'User not found');
      return;
    }
    successResponse(res, 200, 'Profile updated', { user });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update profile', error);
  }
};
