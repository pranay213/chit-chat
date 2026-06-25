import { Otp } from '../models/otp';
import { Setting } from '../models/setting';
import nodemailer from 'nodemailer';
import axios from 'axios';
import logger from '../utils/logger';
import { LoggerMessages } from "../constants/loggerMessages";

/**
 * Generates a random 6-digit OTP and saves it to the database.
 * Sends the OTP via email or SMS.
 */
export const generateAndSendOtp = async (identifier: string, type: 'email' | 'mobile'): Promise<string> => {
  // Generate a random 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  // Save the OTP to the database, associated with the identifier
  await Otp.create({ identifier, otp: otpCode });
  // Fetch settings from database (assuming the first document is the global setting)
  const settings = await Setting.findOne();
  if (type === 'email') {
    if (!settings?.smtpHost || !settings?.smtpPort || !settings?.smtpUser || !settings?.smtpPass || !settings?.smtpFromEmail) {
       logger.warn(LoggerMessages.SMTP_CREDENTIALS_ARE_NOT_FULLY_CONFIGURED_IN);
       return otpCode;
    }
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });
    try {
      await transporter.sendMail({
        from: settings.smtpFromEmail,
        to: identifier,
        subject: 'Your Login OTP',
        text: `Your OTP for login is ${otpCode}. It is valid for 5 minutes.`,
      });
      logger.info(LoggerMessages.EMAIL_SERVICE_OTP_SENT_SUCCESSFULLY_TO_EMAIL(identifier));
    } catch (error) {
      logger.error(LoggerMessages.FAILED_TO_SEND_EMAIL_OTP(error));
      throw new Error('Failed to send email OTP');
    }
  } else if (type === 'mobile') {
    if (!settings?.smsGatewayApiKey) {
       logger.warn(LoggerMessages.SMS_GATEWAY_API_KEY_IS_NOT_CONFIGURED_IN_SETTINGS);
       return otpCode;
    }
    try {
      await axios.post('https://sms-gate-way.onrender.com/api/v1/messages', {
        to: identifier,
        message: `Your OTP for login is ${otpCode}. It is valid for 5 minutes.`,
        channel: 'sms'
      }, {
        headers: {
          'x-api-key': settings.smsGatewayApiKey,
          'Content-Type': 'application/json'
        }
      });
      logger.info(LoggerMessages.SMS_SERVICE_OTP_SENT_SUCCESSFULLY_TO_MOBILE(identifier));
    } catch (error) {
      logger.error(LoggerMessages.FAILED_TO_SEND_MOBILE_OTP(error));
      throw new Error('Failed to send mobile OTP via SMS Gateway');
    }
  }
  return otpCode;
};
const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export interface OtpVerifyResult {
  valid: boolean;
  locked: boolean;
  attemptsLeft: number;
  lockedUntil: Date | null;
}

/**
 * Verifies if the provided OTP matches the one in the database for the given identifier.
 * Tracks failed attempts; locks the OTP record after MAX_ATTEMPTS incorrect guesses.
 */
export const verifyOtpCode = async (identifier: string, otp: string): Promise<OtpVerifyResult> => {
  // Find the most recent OTP record for this identifier (regardless of value to check lock)
  const record = await Otp.findOne({ identifier }).sort({ createdAt: -1 });

  if (!record) {
    return { valid: false, locked: false, attemptsLeft: MAX_ATTEMPTS, lockedUntil: null };
  }

  // Check if currently locked
  if (record.lockedUntil && record.lockedUntil > new Date()) {
    return { valid: false, locked: true, attemptsLeft: 0, lockedUntil: record.lockedUntil };
  }

  // Check if OTP matches
  if (record.otp === otp) {
    await Otp.deleteOne({ _id: record._id });
    return { valid: true, locked: false, attemptsLeft: MAX_ATTEMPTS, lockedUntil: null };
  }

  // Wrong OTP — increment failed attempts
  const newAttempts = (record.failedAttempts || 0) + 1;
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - newAttempts);

  if (newAttempts >= MAX_ATTEMPTS) {
    // Lock the record
    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    await Otp.updateOne({ _id: record._id }, { failedAttempts: newAttempts, lockedUntil });
    return { valid: false, locked: true, attemptsLeft: 0, lockedUntil };
  }

  await Otp.updateOne({ _id: record._id }, { failedAttempts: newAttempts });
  return { valid: false, locked: false, attemptsLeft, lockedUntil: null };
};
