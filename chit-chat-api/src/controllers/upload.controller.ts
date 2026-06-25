import { Request, Response } from 'express';
import { uploadToCloudinary } from '../services/cloudinary.service';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../utils/logger';
import multer from 'multer';

// Use memory storage to stream directly to Cloudinary without writing to disk
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ storage }).single('file');

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      errorResponse(res, 400, 'No file uploaded');
      return;
    }

    const url = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    successResponse(res, 200, 'File uploaded successfully', { url });
  } catch (error: any) {
    logger.error(`Upload error: ${error?.message || error}`);
    errorResponse(res, 500, 'File upload failed', error);
  }
};
