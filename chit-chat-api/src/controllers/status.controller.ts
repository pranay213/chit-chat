import { Request, Response } from 'express';
import { Status } from '../models/status';
import { successResponse, errorResponse } from '../utils/response';
import mongoose from 'mongoose';

export const createStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, type, mediaUrl, backgroundColor } = req.body;
    const userId = (req as any).user.id;

    if (!content) {
      errorResponse(res, 400, 'Content is required for status updates');
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

    successResponse(res, 201, 'Status created successfully', { status: populated });
  } catch (error) {
    errorResponse(res, 500, 'Failed to create status update', error);
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

    successResponse(res, 200, 'Statuses retrieved successfully', {
      myStatuses,
      recentStatuses
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to retrieve statuses', error);
  }
};

export const deleteStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const statusId = req.params.statusId as string;
    const userId = (req as any).user.id;

    if (!mongoose.Types.ObjectId.isValid(statusId)) {
      errorResponse(res, 400, 'Invalid status ID format');
      return;
    }

    const status = await Status.findById(statusId);

    if (!status) {
      errorResponse(res, 404, 'Status update not found');
      return;
    }

    // Check ownership
    if (status.userId.toString() !== userId) {
      errorResponse(res, 403, 'Unauthorized to delete this status update');
      return;
    }

    await Status.findByIdAndDelete(statusId);

    successResponse(res, 200, 'Status update deleted successfully');
  } catch (error) {
    errorResponse(res, 500, 'Failed to delete status update', error);
  }
};
