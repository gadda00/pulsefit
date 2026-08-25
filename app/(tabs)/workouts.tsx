/**
 * Workouts tab — chronological list of all past workouts.
 *
 * Each row is a WorkoutCard that navigates to the workout detail screen.
 * The "Start new" FAB at the bottom-right launches the new-workout modal.
 *
 * If an active (in-progress) workout exists, a banner appears at the top
 * with a "Resume" button — the user shouldn't have to scroll to find it.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Shadows } from '@/constants/theme';
import { useWorkouts } from '@/hooks/useWorkouts';
import { usePreferences } from '@/hooks/usePreferences';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Card, Text, Button, EmptyState } from '@/components/ui';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { formatRelativeTime } from '@/lib/utils';

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { prefs } = usePreferences();
  const { session } = useActiveWorkout();
  const [refresh, setRefresh] = useState(0);
  const { workouts, loading } = useWorkouts(100, refresh);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100 }}
    >
      <Text variant="h1" style={styles.title}>Workouts</Text>
      <Text variant="body" muted>{workouts.length} session{workouts.length === 1 ? '' : 's'} logged</Text>

      {session ? (
        <Card padding="md" style={styles.activeBanner} accentColor={Colors.primary}>
          <View style={styles.activeRow}>
            <View style={{ flex: 1 }}>
              <Text variant="body" semibold>{session.workout.name}</Text>
              <Text variant="caption" muted>
                In progress · {session.sets.length} sets · started {formatRelativeTime(session.workout.startedAt)}
              </Text>
            </View>
            <Button
              label="Resume"
              size="sm"
              onPress={() => router.push(`/workout/${session.workout.id}`)}
              testID="resume-active-btn"
            />
          </View>
        </Card>
      ) : null}

      {loading ? null : workouts.length === 0 ? (
        <EmptyState
          emoji="🏋️"
          title="No workouts yet"
          subtitle="Tap the button below to start your first session."
          ctaLabel="Start Workout"
          onCtaPress={() => router.push('/workout/new')}
        />
      ) : (
        <View style={styles.list}>
          {workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              unit={prefs.preferredUnit}
              onPress={() => router.push(`/workout/${w.id}`)}
              testID={`workout-card-${w.id}`}
            />
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start new workout"
        onPress={() => router.push('/workout/new')}
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
      >
        <Ionicons name="add" size={32} color="#0A0A0A" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    marginBottom: 4,
  },
  activeBanner: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  list: {
    marginTop: Spacing.lg,
  },
  fab: {
    position: 'absolute',
    bottom: 24 + 64,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
});
