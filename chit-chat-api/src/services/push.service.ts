import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export const sendPushNotification = async (pushToken: string | string[], title: string, body: string, data?: any) => {
  const tokens = Array.isArray(pushToken) ? pushToken : [pushToken];
  const validTokens = tokens.filter(t => Expo.isExpoPushToken(t));
  
  if (validTokens.length === 0) {
    console.error(`No valid Expo push tokens provided: ${pushToken}`);
    return false;
  }

  const messages: ExpoPushMessage[] = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    categoryId: data?.categoryId,
    data: data || {},
  }));

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
