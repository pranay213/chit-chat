import { Request, Response } from 'express';
import { Status } from '../models/status';
import { successResponse, errorResponse } from '../utils/response';
import { ErrorMessages, SuccessMessages } from '../constants/errors';
import mongoose from 'mongoose';

export const createStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, type, mediaUrl, backgroundColor } = req.body;
    const userId = (req as any).user.id;

    if (!content) {
      errorResponse(res, 400, ErrorMessages.STATUS.CONTENT_REQUIRED);
      return;
    }

    const newStatus = await Status.create({
      userId,
      content,
      type: type || 'text',
      mediaUrl,
      backgroundColor: backgroundColor || '#7E57C2'
    });

    const populated = await newStatus.populate('userId', 'displayName email mobileNumber profileImage');

    successResponse(res, 201, SuccessMessages.STATUS.CREATED, { status: populated });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.STATUS.CREATED_FAILED, error);
  }
};

export const getStatuses = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    // Fetch all active statuses
    const allStatuses = await Status.find()
      .populate('userId', 'displayName email mobileNumber profileImage status')
      .sort({ createdAt: -1 });

    // Separate my statuses from other users' statuses
    const myStatuses = allStatuses.filter(s => s.userId && s.userId._id.toString() === userId);
    const otherStatusesRaw = allStatuses.filter(s => s.userId && s.userId._id.toString() !== userId);

    // Group other users' statuses by user
    const otherGroupsMap = new Map<string, any>();

    otherStatusesRaw.forEach(status => {
      const userObj: any = status.userId;
      if (!userObj) return;
      const uId = userObj._id.toString();

      if (!otherGroupsMap.has(uId)) {
        otherGroupsMap.set(uId, {
          userId: uId,
          displayName: userObj.displayName || userObj.email || userObj.mobileNumber,
          profileImage: userObj.profileImage,
          status: userObj.status, // online / offline
          updatedAt: status.createdAt,
          statuses: []
        });
      }

      otherGroupsMap.get(uId).statuses.push({
        _id: status._id,
        content: status.content,
        type: status.type,
        mediaUrl: status.mediaUrl,
        backgroundColor: status.backgroundColor,
        createdAt: status.createdAt
      });
    });

    const recentStatuses = Array.from(otherGroupsMap.values());

    successResponse(res, 200, SuccessMessages.STATUS.RETRIEVED, {
      myStatuses,
      recentStatuses
    });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.STATUS.RETRIEVED_FAILED, error);
  }
};

export const deleteStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const statusId = req.params.statusId as string;
    const userId = (req as any).user.id;

    if (!mongoose.Types.ObjectId.isValid(statusId)) {
      errorResponse(res, 400, ErrorMessages.STATUS.INVALID_ID);
      return;
    }

    const status = await Status.findById(statusId);

    if (!status) {
      errorResponse(res, 404, ErrorMessages.STATUS.NOT_FOUND);
      return;
    }

    // Check ownership
    if (status.userId.toString() !== userId) {
      errorResponse(res, 403, ErrorMessages.STATUS.DELETE_UNAUTHORIZED);
      return;
    }

    await Status.findByIdAndDelete(statusId);

    successResponse(res, 200, SuccessMessages.STATUS.DELETED);
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.STATUS.DELETED_FAILED, error);
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const statusId = req.params.statusId as string;
    const userId = (req as any).user.id;
    const { content, backgroundColor, type, mediaUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(statusId)) {
      errorResponse(res, 400, ErrorMessages.STATUS.INVALID_ID);
      return;
    }

    const status = await Status.findById(statusId);

    if (!status) {
      errorResponse(res, 404, ErrorMessages.STATUS.NOT_FOUND);
      return;
    }

    // Check ownership
    if (status.userId.toString() !== userId) {
      errorResponse(res, 403, ErrorMessages.STATUS.UPDATE_UNAUTHORIZED);
      return;
    }

    const updated = await Status.findByIdAndUpdate(
      statusId,
      {
        content: content || status.content,
        backgroundColor: backgroundColor || status.backgroundColor,
        type: type || status.type,
        mediaUrl: mediaUrl || status.mediaUrl
      },
      { new: true }
    ).populate('userId', 'displayName email mobileNumber profileImage');

    successResponse(res, 200, SuccessMessages.STATUS.UPDATED, { status: updated });
  } catch (error) {
    errorResponse(res, 500, ErrorMessages.STATUS.UPDATED_FAILED, error);
  }
};
