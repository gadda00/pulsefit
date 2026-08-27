/**
 * Root layout for PulseFit.
 *
 * Expo Router renders this file at the top of the navigation tree. We use it
 * to:
 *  - Wrap the app in a SafeAreaProvider (so screens can use safe area insets).
 *  - Run the database migration + active-workout hydration on first paint.
 *  - Render a Stack navigator that holds the (tabs) group plus the modal
 *    screens (workout detail, exercise picker, scanned product detail).
 */

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { migrate } from '@/lib/db';
import { useWorkoutStore } from '@/store/workoutStore';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hydrate = useWorkoutStore((s) => s.hydrate);

  useEffect(() => {
    try {
      migrate();
      hydrate();
    } catch (e) {
      // Don't crash the app if the DB fails — screens will fall back to
      // empty states and surface the error in their own UI.
      console.warn('Migration / hydration failed:', e);
    } finally {
      setReady(true);
    }
  }, [hydrate]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout/[id]"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="workout/new"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="exercise/[id]"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="scanned/[id]"
          options={{ headerShown: false, presentation: 'card' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
