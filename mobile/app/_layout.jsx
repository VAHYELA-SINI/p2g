import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { colors, shadows } from '../src/theme';

/**
 * Root Layout Component
 * Managed by Expo Router without nested NavigationContainer.
 */
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading, restoreSession } = useAuthStore();

  // Restore authenticated session from SecureStore on startup
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Auth routing guard: Handles protected routes and authentication redirects
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Unauthenticated: Redirect to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Authenticated: Redirect to customer app
      router.replace('/(app)');
    }
  }, [user, isLoading, segments, router]);

  // Loading state during session restoration
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>P2G</Text>
        </View>
        <ActivityIndicator size="large" color={colors.black} style={styles.spinner} />
        <Text style={styles.loadingText}>Restoring your session...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...shadows.md,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1.5,
  },
  spinner: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
  },
});
