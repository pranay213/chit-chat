import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: true
  }),
});

let pushRegistered = false;

export async function registerForPushNotificationsAsync(token: string) {
  // Prevent repeated calls on every socket reconnection
  if (pushRegistered) return;
  
  let pushToken;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7E57C2',
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#00E676',
    });

    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 500, 500, 500, 500],
      lightColor: '#FF3B30',
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
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'd3da7828-562a-4ab8-89a2-c5478d4d7530';
      pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      
      console.log('====================================');
      console.log('EXPO PUSH TOKEN:');
      console.log(pushToken);
      console.log('====================================');

      if (token && pushToken) {
        await api.updatePushToken(token, pushToken);
      }
      pushRegistered = true; // Mark as registered only on success
    } catch (e: any) {
      // Firebase/FCM not configured — silently skip, socket notifications still work
      if (e?.message?.includes('Firebase') || e?.message?.includes('FCM')) {
        console.log('Push notifications require Firebase setup. See: https://docs.expo.dev/push-notifications/fcm-credentials/');
      } else {
        console.log('Error getting push token', e);
      }
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
