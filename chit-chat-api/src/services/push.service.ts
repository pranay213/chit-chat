import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export const sendPushNotification = async (pushToken: string, title: string, body: string, data?: any) => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return false;
  }

  const messages: ExpoPushMessage[] = [{
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  }];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    return true;
  } catch (error) {
    console.error('Error sending push notification', error);
    return false;
  }
};
