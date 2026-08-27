/**
 * Tab navigator — 5 tabs: Home, Workouts, Scan, Progress, Profile.
 *
 * The Scan tab is centered and elevated (larger, floating) to draw attention
 * to the camera scanning innovation. Icons use Ionicons for consistency with
 * the rest of the app.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/constants/theme';

function TabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
  // Cast to any: @expo/vector-icons' glyphMap union has 2000+ entries and
  // doesn't accept arbitrary strings, but our usage is always a known icon.
  return <Ionicons name={(focused ? name : `${name}-outline`) as any} size={24} color={color} />;
}

function ScanTabButton({ onPress, focused }: { onPress: () => void; focused: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.scanButtonWrap}>
      <View style={[styles.scanButton, focused && styles.scanButtonFocused]}>
        <Ionicons name="scan" size={28} color="#0A0A0A" />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: Typography.fontSize.xs,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, focused }) => <TabIcon name="barbell" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarButton: (props) => (
            <ScanTabButton onPress={(props as any).onPress} focused={(props as any).accessibilityState?.selected} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => <TabIcon name="analytics" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon name="person" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButtonWrap: {
    top: -22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  scanButtonFocused: {
    transform: [{ scale: 1.05 }],
  },
});
