import { Response } from 'express';
import { translateMessage } from './translation';

export const successResponse = (res: Response, statusCode: number, messageCode: string, data: any = {}) => {
  const lang = (res.req?.headers['accept-language'] || 'en') as string;
  const translatedMessage = translateMessage(messageCode, lang);

  return res.status(statusCode).json({
    success: true,
    messageCode,
    message: translatedMessage,
    ...data
  });
};

export const errorResponse = (res: Response, statusCode: number, messageCode: string, error?: any) => {
  const lang = (res.req?.headers['accept-language'] || 'en') as string;
  const translatedMessage = translateMessage(messageCode, lang);

  const payload: any = {
    success: false,
    messageCode,
    message: translatedMessage
  };
  if (error) {
    payload.error = error;
  }
  return res.status(statusCode).json(payload);
};
