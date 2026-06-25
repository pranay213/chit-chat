import { Response } from 'express';
import { Setting } from '../models/setting';
import { successResponse, errorResponse } from '../utils/response';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import logger from '../utils/logger';
import { AuthRequest } from '../middlewares/admin.middleware';
import { LoggerMessages } from "../constants/loggerMessages";

const maskString = (str: string) => {
  if (!str) return str;
  if (str.length <= 1) return '*';
  return str.charAt(0) + '*'.repeat(str.length - 1);
};

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await Setting.findOne();
    let settingsData = settings ? settings.toObject() : {};

    if (settingsData.smsGatewayApiKey) settingsData.smsGatewayApiKey = maskString(settingsData.smsGatewayApiKey);
    if (settingsData.cloudinaryApiKey) settingsData.cloudinaryApiKey = maskString(settingsData.cloudinaryApiKey);
    if (settingsData.cloudinaryApiSecret) settingsData.cloudinaryApiSecret = maskString(settingsData.cloudinaryApiSecret);
    if (settingsData.smtpPass) settingsData.smtpPass = maskString(settingsData.smtpPass);

    successResponse(res, 200, SuccessMessages.SETTING.RETRIEVED, { settings: settingsData });
  } catch (error) {
    logger.error(LoggerMessages.GET_SETTINGS_ERROR(error));
    errorResponse(res, 500, ErrorMessages.SETTING.RETRIEVED_FAILED, error);
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user.id;
    const updateData = req.body;
    updateData.updatedBy = adminId;

    // Prevent saving masked values back to the DB
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'string' && updateData[key].includes('**')) {
        delete updateData[key];
      }
    });

    const settings = await Setting.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    successResponse(res, 200, SuccessMessages.SETTING.UPDATED, { settings });
  } catch (error) {
    logger.error(LoggerMessages.UPDATE_SETTINGS_ERROR(error));
    errorResponse(res, 500, ErrorMessages.SETTING.UPDATED_FAILED, error);
  }
};
