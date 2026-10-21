
import { useEffect, useState } from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setLoadingTimedOut(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const firstSegment = segments[0];
  const inAuthGroup =
    firstSegment === 'login' || firstSegment === 'register';

  if (loading && !loadingTimedOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          Loading QR Attendance...
        </Text>
      </View>
    );
  }

  if (!session && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName="(tabs)"
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="event-details" />
      <Stack.Screen name="attendance-details" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
