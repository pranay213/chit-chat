import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

let socket: Socket | null = null;

const getSocketUrl = () => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }
  const debuggerHost = Constants.expoConfig?.hostUri || '';
  const host = debuggerHost.split(':')[0] || 'localhost';
  return `http://${host}:5000`;
};

export const connectSocket = (token: string): Socket => {
  if (socket) {
    socket.disconnect();
  }

  const url = getSocketUrl();
  console.log(`Connecting socket to: ${url}`);
  
  socket = io(url, {
    auth: {
      token,
    },
    transports: ['polling', 'websocket'], // Allow polling fallback for connection reliability
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
