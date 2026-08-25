/**
 * Progress tab — analytics dashboards.
 *
 * Three sections, each driven by the analytics module:
 *  1. Time-window selector (7d / 30d / 90d) at the top.
 *  2. Volume over time line chart for the selected window.
 *  3. Muscle group split (horizontal bars).
 *  4. Top exercises by volume (leaderboard).
 *  5. All-time personal records (sorted by estimated 1RM).
 *
 * All charts are dark-themed and respect the user's preferred weight unit.
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import {
  getVolumeByDay,
  getMuscleGroupSplit,
  getTopExercisesByVolume,
  getAllPersonalRecords,
} from '@/lib/analytics';
import { usePreferences } from '@/hooks/usePreferences';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Card, Text, SegmentedControl, EmptyState } from '@/components/ui';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { MuscleSplitChart } from '@/components/charts/MuscleSplitChart';
import { formatVolume, formatWeight } from '@/lib/utils';

type Window = '7d' | '30d' | '90d';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { prefs } = usePreferences();
  const { session } = useActiveWorkout(); // re-render when active workout changes
  const [window, setWindow] = useState<Window>('30d');

  const days = window === '7d' ? 7 : window === '30d' ? 30 : 90;

  const volumeData = useMemo(() => getVolumeByDay(days), [days, session]);
  const muscleSplit = useMemo(() => getMuscleGroupSplit(days), [days, session]);
  const topExercises = useMemo(() => getTopExercisesByVolume(days, new Date(), 5), [days, session]);
  const prs = useMemo(() => getAllPersonalRecords(), [session]);

  const hasData = volumeData.some((d) => d.volume > 0) || topExercises.length > 0 || prs.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100 }}
    >
      <Text variant="h1">Progress</Text>
      <Text variant="body" muted style={{ marginTop: 4 }}>
        Track volume, muscle balance, and personal records over time.
      </Text>

      <View style={styles.windowSelector}>
        <SegmentedControl<Window>
          value={window}
          onChange={setWindow}
          options={[
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
            { value: '90d', label: '90 Days' },
          ]}
          testID="window-selector"
        />
      </View>

      {!hasData ? (
        <EmptyState
          emoji="📊"
          title="No data yet"
          subtitle="Log a few workouts and your progress charts will appear here."
        />
      ) : (
        <>
          {/* Volume chart */}
          <Card padding="md" style={styles.sectionCard}>
            <Text variant="h3" style={styles.sectionTitle}>Volume Over Time</Text>
            <Text variant="caption" muted>
              Total daily training volume ({prefs.preferredUnit})
            </Text>
            <VolumeChart data={volumeData} unit={prefs.preferredUnit} testID="volume-chart" />
          </Card>

          {/* Muscle group split */}
          <Card padding="md" style={styles.sectionCard}>
            <Text variant="h3" style={styles.sectionTitle}>Muscle Group Balance</Text>
            <Text variant="caption" muted>
              Volume distribution by category ({window})
            </Text>
            <View style={{ marginTop: Spacing.md }}>
              <MuscleSplitChart data={muscleSplit} testID="muscle-split" />
            </View>
          </Card>

          {/* Top exercises */}
          <Card padding="md" style={styles.sectionCard}>
            <Text variant="h3" style={styles.sectionTitle}>Top Exercises</Text>
            <Text variant="caption" muted>By volume ({window})</Text>
            <View style={{ marginTop: Spacing.md }}>
              {topExercises.length === 0 ? (
                <Text variant="body" muted center>No data for this window.</Text>
              ) : (
                topExercises.map((ex, idx) => (
                  <View key={ex.exerciseId} style={styles.leaderRow}>
                    <View style={styles.rankBadge}>
                      <Text variant="caption" style={styles.rankText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" semibold numberOfLines={1}>{ex.exerciseName}</Text>
                      <Text variant="caption" muted>{ex.sets} sets</Text>
                    </View>
                    <Text variant="body" accent semibold>
                      {formatVolume(ex.volume, prefs.preferredUnit)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Card>

          {/* All-time PRs */}
          <Card padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text variant="h3" style={styles.sectionTitle}>Personal Records</Text>
                <Text variant="caption" muted>All-time best lifts (estimated 1RM)</Text>
              </View>
              <Ionicons name="trophy" size={28} color={Colors.primary} />
            </View>
            <View style={{ marginTop: Spacing.md }}>
              {prs.length === 0 ? (
                <Text variant="body" muted center>No PRs yet — start lifting!</Text>
              ) : (
                prs.slice(0, 10).map((pr) => (
                  <View key={pr.exerciseId} style={styles.prRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" semibold numberOfLines={1}>{pr.exerciseName}</Text>
                      <Text variant="caption" muted>
                        {pr.reps} reps @ {formatWeight(pr.weight, prefs.preferredUnit)}
                      </Text>
                    </View>
                    <Text variant="h3" accent>{formatWeight(pr.estimated1RM, prefs.preferredUnit)}</Text>
                  </View>
                ))
              )}
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  windowSelector: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
});
