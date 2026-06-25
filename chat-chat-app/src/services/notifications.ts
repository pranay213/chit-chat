import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  }),
});

export async function registerForPushNotificationsAsync(token: string) {
  let pushToken;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7E57C2',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    try {
      const projectId = 'b4528d75-fa80-4966-8809-5c1cfb9b00cd'; // Optional if not using expo EAS, but good practice
      pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      
      // Send token to backend
      if (token && pushToken) {
        await api.updatePushToken(token, pushToken);
      }
    } catch (e) {
      console.log('Error getting push token', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return pushToken;
}

export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('CHAT_MESSAGE', [
    {
      identifier: 'QUICK_REPLY',
      buttonTitle: 'Reply',
      textInput: {
        submitButtonTitle: 'Send',
        placeholder: 'Type a reply...',
      },
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}
