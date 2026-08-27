/**
 * Home dashboard — the first thing the user sees when they open PulseFit.
 *
 * Layout (top to bottom):
 *  1. Greeting header with the user's name (or "Athlete" if unset) and the
 *     current streak as a flame icon + number.
 *  2. Big "Start workout" CTA. If a workout is already in progress, this
 *     becomes a "Resume workout" button that jumps to the active session.
 *  3. 2x2 grid of stat cards: workouts this week, total volume, total sets,
 *     total time.
 *  4. Weekly streak calendar (7 dots showing which days had a workout).
 *  5. Recent workouts list (last 3), each tappable to view detail.
 *
 * All data is read synchronously from SQLite via the analytics module so the
 * first paint already shows real numbers — no spinner.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import { getWeeklySummary, getVolumeByDay } from '@/lib/analytics';
import { getRecentWorkouts } from '@/lib/db';
import { usePreferences } from '@/hooks/usePreferences';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { toISODate, formatVolume, formatDuration, formatRelativeTime } from '@/lib/utils';
import { Button, Card, Text, StatCard, EmptyState } from '@/components/ui';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { StreakCalendar } from '@/components/charts/StreakCalendar';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { prefs } = usePreferences();
  const { session, start } = useActiveWorkout();

  // Re-compute when the active session changes (so finishing a workout
  // immediately updates the dashboard).
  const summary = useMemo(() => getWeeklySummary(), [session]);
  const recent = useMemo(() => getRecentWorkouts(3), [session]);
  const workoutDates = useMemo(
    () => getVolumeByDay(7).filter((d) => d.volume > 0).map((d) => d.date),
    [session],
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const userName = prefs.userName?.trim() || 'Athlete';

  const handleStartWorkout = () => {
    if (session) {
      router.push(`/workout/${session.workout.id}`);
    } else {
      router.push('/workout/new');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" muted>{greeting}</Text>
          <Text variant="h1">{userName}</Text>
        </View>
        {summary.currentStreak > 0 ? (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={20} color={Colors.primary} />
            <Text variant="body" accent semibold>{summary.currentStreak}</Text>
          </View>
        ) : null}
      </View>

      {/* Main CTA */}
      <Button
        label={session ? 'Resume Workout' : 'Start Workout'}
        onPress={handleStartWorkout}
        size="lg"
        icon={<Ionicons name={session ? 'play-circle' : 'add-circle'} size={22} color="#0A0A0A" />}
        testID="start-workout-btn"
      />

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Workouts"
          value={String(summary.workoutsCount)}
          caption="this week"
          testID="stat-workouts"
        />
        <StatCard
          label="Volume"
          value={formatVolume(summary.totalVolume, prefs.preferredUnit)}
          caption="this week"
          testID="stat-volume"
        />
        <StatCard
          label="Sets"
          value={String(summary.totalSets)}
          caption="this week"
          testID="stat-sets"
        />
        <StatCard
          label="Time"
          value={formatDuration(summary.totalDurationSec)}
          caption="this week"
          testID="stat-time"
        />
      </View>

      {/* Streak calendar */}
      <Card padding="md" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">This Week</Text>
          <Text variant="caption" muted>{summary.currentStreak} day streak</Text>
        </View>
        <StreakCalendar workoutDates={workoutDates} />
      </Card>

      {/* Recent workouts */}
      <View style={styles.sectionHeader}>
        <Text variant="h3">Recent Workouts</Text>
        <Pressable onPress={() => router.push('/workouts')}>
          <Text variant="caption" accent>See all</Text>
        </Pressable>
      </View>

      {recent.length === 0 ? (
        <EmptyState
          emoji="🏋️"
          title="No workouts yet"
          subtitle="Tap 'Start Workout' above to log your first session."
          ctaLabel="Start Workout"
          onCtaPress={handleStartWorkout}
        />
      ) : (
        recent.map((w) => (
          <WorkoutCard
            key={w.id}
            workout={w}
            unit={prefs.preferredUnit}
            onPress={() => router.push(`/workout/${w.id}`)}
            testID={`recent-workout-${w.id}`}
          />
        ))
      )}

      {summary.lastWorkoutAt ? (
        <Text variant="caption" muted center style={styles.lastWorkout}>
          Last workout {formatRelativeTime(summary.lastWorkoutAt)}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  lastWorkout: {
    marginTop: Spacing.lg,
  },
});
