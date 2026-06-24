import { Response } from 'express';
export const successResponse = (res: Response, statusCode: number, message: string, data: any = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};
export const errorResponse = (res: Response, statusCode: number, message: string, error?: any) => {
  const payload: any = {
    success: false,
    message
  };
  if (error) {
    payload.error = error;
  }
  return res.status(statusCode).json(payload);
};
