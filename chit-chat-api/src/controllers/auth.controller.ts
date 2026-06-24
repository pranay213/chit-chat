import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { Session } from '../models/session';
import { generateAndSendOtp, verifyOtpCode } from '../services/otp.service';
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
    if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
      data.mockOtp = otpCode; // Send back for easy testing
    }
    successResponse(res, 200, SuccessMessages.AUTH.OTP_SENT, data);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.AUTH.OTP_SEND_FAILED, error);
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobileNumber, email, otp } = req.body;
    let isOtpValid = false;
    if (!mobileNumber && !email) {
      errorResponse(res, 400, ErrorMessages.AUTH.MISSING_FIELDS);
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
    } else {
      errorResponse(res, 400, ErrorMessages.AUTH.INVALID_OTP);
    }
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.AUTH.OTP_VERIFY_FAILED, error);
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params; // Or get from JWT auth middleware
    const updateData = req.body; // email, gender, username, displayName, profileImage, slogan
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    if (!user) {
      errorResponse(res, 404, ErrorMessages.AUTH.USER_NOT_FOUND);
      return;
    }
    successResponse(res, 200, SuccessMessages.AUTH.PROFILE_UPDATED, { user });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.AUTH.PROFILE_UPDATE_FAILED, error);
  }
};
