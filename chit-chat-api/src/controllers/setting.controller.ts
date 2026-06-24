import { Response } from 'express';
import { Setting } from '../models/setting';
import { successResponse, errorResponse } from '../utils/response';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import logger from '../utils/logger';
import { AuthRequest } from '../middlewares/admin.middleware';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await Setting.findOne();
    successResponse(res, 200, SuccessMessages.SETTING.RETRIEVED, { settings });
  } catch (error) {
    logger.error(`Get Settings error: ${error}`);
    errorResponse(res, 500, ErrorMessages.SETTING.RETRIEVED_FAILED, error);
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user.id;
    const updateData = req.body;
    updateData.updatedBy = adminId;

    const settings = await Setting.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    successResponse(res, 200, SuccessMessages.SETTING.UPDATED, { settings });
  } catch (error) {
    logger.error(`Update Settings error: ${error}`);
    errorResponse(res, 500, ErrorMessages.SETTING.UPDATED_FAILED, error);
  }
};
