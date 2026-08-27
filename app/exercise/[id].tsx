/**
 * Exercise detail screen — shows the user's history with a single exercise.
 *
 * Layout:
 *  - Header: exercise name + category/equipment chips.
 *  - PR card: estimated 1RM, achieved weight × reps, and the date it was set.
 *  - History list: every set ever logged for this exercise, newest first.
 *
 * Used to give the user a quick "where am I at with squat?" view without
 * having to scroll through full workouts.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import {
  getExerciseById,
} from '@/lib/db';
import { getPersonalRecord } from '@/lib/analytics';
import { usePreferences } from '@/hooks/usePreferences';
import { formatWeight, formatRelativeTime } from '@/lib/utils';
import { Card, Text, Chip, EmptyState } from '@/components/ui';
import { CATEGORY_LABELS, EQUIPMENT_LABELS } from '@/constants/exercises';

// Inline query: get all sets for this exercise across all workouts.
// We don't expose this in db.ts because it's only used here.
function getSetsForExercise(exerciseId: number) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getDb } = require('@/lib/db') as typeof import('@/lib/db');
  const db = getDb();
  const rows = db.getAllSync<any>(
    `SELECT s.*, w.started_at AS workout_started_at, w.name AS workout_name
     FROM workout_sets s
     JOIN workouts w ON w.id = s.workout_id
     WHERE s.exercise_id = ?
     ORDER BY s.completed_at DESC`,
    [exerciseId],
  );
  return rows.map((r: any) => ({
    id: r.id,
    reps: r.reps,
    weight: r.weight,
    durationSec: r.duration_sec,
    isPR: r.is_pr === 1,
    completedAt: r.completed_at,
    workoutName: r.workout_name,
    workoutStartedAt: r.workout_started_at,
  }));
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = Number(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { prefs } = usePreferences();

  const exercise = useMemo(() => getExerciseById(exerciseId), [exerciseId]);
  const pr = useMemo(() => getPersonalRecord(exerciseId), [exerciseId]);
  const history = useMemo(() => exercise ? getSetsForExercise(exerciseId) : [], [exerciseId, exercise]);

  if (!exercise) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState emoji="❓" title="Exercise not found" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 40 }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={26} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text variant="h1" numberOfLines={2}>{exercise.name}</Text>
          <View style={styles.chipsRow}>
            <Chip label={CATEGORY_LABELS[exercise.category]} color={Colors.category[exercise.category]} size="sm" />
            <Chip label={EQUIPMENT_LABELS[exercise.equipment]} size="sm" />
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* PR card */}
        <Card padding="lg" accentColor={Colors.primary}>
          <Text variant="label" muted>PERSONAL RECORD</Text>
          {pr ? (
            <>
              <Text variant="display" accent style={{ marginVertical: Spacing.sm }}>
                {formatWeight(pr.estimated1RM, prefs.preferredUnit)}
              </Text>
              <Text variant="body" muted>
                Estimated 1RM · achieved with {pr.reps} reps @ {formatWeight(pr.weight, prefs.preferredUnit)} on {new Date(pr.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </>
          ) : (
            <Text variant="body" muted style={{ marginTop: Spacing.sm }}>
              No personal record yet. Log a set of this exercise to see your estimated 1RM here.
            </Text>
          )}
        </Card>

        {/* History */}
        <Text variant="h3" style={styles.sectionTitle}>History</Text>
        <Text variant="caption" muted>{history.length} set{history.length === 1 ? '' : 's'} logged</Text>

        {history.length === 0 ? (
          <EmptyState emoji="📝" title="No history yet" subtitle="Sets logged for this exercise will appear here." />
        ) : (
          <View style={{ marginTop: Spacing.md }}>
            {history.map((s: { id: number; reps: number | null; weight: number | null; durationSec: number | null; isPR: boolean; completedAt: string; workoutName: string }) => (
              <Card key={s.id} padding="md" style={{ marginBottom: Spacing.sm }}>
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" semibold>
                      {s.reps != null ? `${s.reps} reps` : ''}
                      {s.weight != null ? ` @ ${formatWeight(s.weight, prefs.preferredUnit)}` : ''}
                      {s.durationSec != null ? ` · ${s.durationSec}s` : ''}
                    </Text>
                    <Text variant="caption" muted numberOfLines={1}>
                      {s.workoutName} · {formatRelativeTime(s.completedAt)}
                    </Text>
                  </View>
                  {s.isPR ? (
                    <View style={styles.prBadge}>
                      <Text variant="label" style={styles.prText}>PR</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  body: { paddingHorizontal: Spacing.lg },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: 4 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  prText: {
    color: '#0A0A0A',
    fontSize: 10,
  },
});
