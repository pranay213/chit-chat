import logger from '../utils/logger';

export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: any;
  categoryId?: string;
}

export const sendPushNotification = async (payload: PushNotificationPayload) => {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    logger.info(`Push notification sent: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    logger.error(`Failed to send push notification: ${error}`);
    return null;
  }
};
