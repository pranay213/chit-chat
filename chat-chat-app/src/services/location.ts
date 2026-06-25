import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getSocket } from './socket';
import { Alert } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

// Store active chats that requested location
let activeLocationChats = new Set<string>();
let activeUserId = '';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      const socket = getSocket();
      
      if (socket && activeLocationChats.size > 0 && activeUserId) {
        activeLocationChats.forEach(chatId => {
          socket.emit('locationUpdate', {
            chatId,
            lat: latitude,
            lng: longitude,
            userId: activeUserId,
          });
        });
      }
    }
  }
});

export const startLocationSharing = async (chatId: string, userId: string) => {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    Alert.alert('Permission Denied', 'Foreground location permission is required.');
    return;
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    Alert.alert('Permission Denied', 'Background location permission is required for continuous sharing.');
    return;
  }

  activeLocationChats.add(chatId);
  activeUserId = userId;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Chit-Chat Location Sharing',
        notificationBody: 'You are sharing your live location.',
        notificationColor: '#7E57C2',
      }
    });
  }
};

export const stopLocationSharing = async (chatId: string) => {
  activeLocationChats.delete(chatId);
  
  const socket = getSocket();
  if (socket) {
    socket.emit('locationStopped', { chatId, userId: activeUserId });
  }

  if (activeLocationChats.size === 0) {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }
};

export const isSharingLocation = (chatId: string) => {
  return activeLocationChats.has(chatId);
};
