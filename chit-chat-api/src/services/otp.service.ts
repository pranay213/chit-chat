import { Otp } from '../models/otp';
import { Setting } from '../models/setting';
import nodemailer from 'nodemailer';
import axios from 'axios';
import logger from '../utils/logger';
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
       logger.warn('SMTP credentials are not fully configured in settings.');
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
      logger.info(`[EMAIL SERVICE] OTP sent successfully to email: ${identifier}`);
    } catch (error) {
      logger.error(`Failed to send email OTP: ${error}`);
      throw new Error('Failed to send email OTP');
    }
  } else if (type === 'mobile') {
    if (!settings?.fast2smsApiKey) {
       logger.warn('Fast2SMS API Key is not configured in settings.');
       return otpCode;
    }
    try {
      await axios.get('https://www.fast2sms.com/dev/bulkV2', {
        params: {
          authorization: settings.fast2smsApiKey,
          variables_values: otpCode,
          route: 'otp',
          numbers: identifier,
        }
      });
      logger.info(`[SMS SERVICE] OTP sent successfully to mobile: ${identifier}`);
    } catch (error) {
      logger.error(`Failed to send mobile OTP: ${error}`);
      throw new Error('Failed to send mobile OTP via Fast2SMS');
    }
  }
  return otpCode;
};
/**
 * Verifies if the provided OTP matches the one in the database for the given identifier.
 */
export const verifyOtpCode = async (identifier: string, otp: string): Promise<boolean> => {
  const record = await Otp.findOne({ identifier, otp });
  if (record) {
    // Optionally delete the OTP after successful verification so it can't be reused
    await Otp.deleteOne({ _id: record._id });
    return true;
  }
  return false;
};
