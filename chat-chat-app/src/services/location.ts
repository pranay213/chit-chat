import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getSocket } from './socket';
import { Alert } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

let activeLocationChats = new Set<string>();
let activeUserId = '';
// Tracks the foreground-only watchPositionAsync subscription
let fgSubscription: Location.LocationSubscription | null = null;

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
          socket.emit('locationUpdate', { chatId, lat: latitude, lng: longitude, userId: activeUserId });
        });
      }
    }
  }
});

export const startLocationSharing = async (chatId: string, userId: string) => {
  // Idempotency guard — never start twice for the same chat
  if (activeLocationChats.has(chatId)) return;

  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    Alert.alert('Permission Denied', 'Foreground location permission is required.');
    return;
  }

  activeLocationChats.add(chatId);
  activeUserId = userId;

  // Try background task first; fall back to foreground-only watch
  let usingBackground = false;
  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus === 'granted') {
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
          },
        });
      }
      usingBackground = true;
    }
  } catch (e) {
    console.log('Background location not available, using foreground only:', e);
  }

  if (!usingBackground) {
    // Remove any stale subscription before creating a new one
    if (fgSubscription) {
      fgSubscription.remove();
      fgSubscription = null;
    }
    const socket = getSocket();
    fgSubscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 10 },
      (loc) => {
        if (socket && activeLocationChats.size > 0 && activeUserId) {
          activeLocationChats.forEach(activeChatId => {
            socket.emit('locationUpdate', {
              chatId: activeChatId,
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              userId: activeUserId,
            });
          });
        }
      }
    );
  }
};

export const stopLocationSharing = async (chatId: string) => {
  activeLocationChats.delete(chatId);

  const socket = getSocket();
  if (socket) {
    socket.emit('locationStopped', { chatId, userId: activeUserId });
  }

  // Only fully stop tracking when no more active chats
  if (activeLocationChats.size === 0) {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (e) {
      // ignore — task may not have been registered
    }

    if (fgSubscription) {
      fgSubscription.remove();
      fgSubscription = null;
    }

    activeUserId = '';
  }
};

export const isSharingLocation = (chatId: string) => {
  return activeLocationChats.has(chatId);
};
