import { Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { getSocket } from '../../services/socket';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('incomingCall', (data: any) => {
        Alert.alert(
          'Incoming Call',
          `${data.name} is calling you`,
          [
            { text: 'Decline', style: 'cancel', onPress: () => {
              socket.emit('rejectCall', { to: data.from });
            }},
            { text: 'Accept', onPress: () => {
              router.push({
                pathname: '/call',
                params: {
                  chatId: data.chatId || '',
                  type: 'video', // we can extract type from signal or payload if added
                  callerName: data.name,
                  receiverId: data.from,
                  isIncoming: 'true',
                  signal: JSON.stringify(data.signal)
                }
              });
            }}
          ]
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('incomingCall');
      }
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#7E57C2', // Purple active tint
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#EFEFEF',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="call" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Status',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
