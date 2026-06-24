import { Response } from 'express';
import { Setting } from '../models/setting';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../utils/logger';
import { AuthRequest } from '../middlewares/admin.middleware';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await Setting.findOne();
    successResponse(res, 200, 'Settings retrieved successfully', { settings });
  } catch (error) {
    logger.error(`Get Settings error: ${error}`);
    errorResponse(res, 500, 'Failed to retrieve settings', error);
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

    successResponse(res, 200, 'Settings updated successfully', { settings });
  } catch (error) {
    logger.error(`Update Settings error: ${error}`);
    errorResponse(res, 500, 'Failed to update settings', error);
  }
};
