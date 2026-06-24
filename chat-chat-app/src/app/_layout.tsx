import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootLayoutNav() {
  const { token, isLoading } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = 
      segments[0] === 'login' || 
      segments[0] === 'register' || 
      segments[0] === 'verify' || 
      segments.length === 0 || 
      (segments[0] === '(aux)' && segments[1] === 'index'); // handle any aux routing root if present

    const isRoot = segments.length === 0 || (segments.length === 1 && segments[0] === 'index');

    const inAuth = inAuthGroup || isRoot;

    if (!token && !inAuth) {
      // Redirect to welcome screen if unauthorized
      router.replace('/');
    } else if (token && inAuth) {
      // Redirect to chats screen if already authorized
      router.replace('/chats');
    }
  }, [token, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size="large" color="#7E57C2" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="new-chat" />
      <Stack.Screen name="call" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}
