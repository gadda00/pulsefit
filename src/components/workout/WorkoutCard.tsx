/**
 * WorkoutCard — list item for a past workout.
 *
 * Shows: name, date, duration, total volume, set count.
 * Tappable to navigate to the workout detail screen.
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import type { Workout, WeightUnit } from '@/types';
import { formatHumanDate, formatDuration, formatVolume } from '@/lib/utils';
import { Card, Text } from '@/components/ui';

export interface WorkoutCardProps {
  workout: Workout;
  unit?: WeightUnit;
  onPress?: () => void;
  testID?: string;
}

export function WorkoutCard({ workout, unit = 'kg', onPress, testID }: WorkoutCardProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${workout.name}, ${workout.totalSets} sets`}
      onPress={onPress}
      style={({ pressed }) => pressed ? { opacity: 0.85 } : null}
    >
      <Card padding="md" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text variant="h3" numberOfLines={1}>{workout.name}</Text>
            <Text variant="caption" muted style={styles.date}>
              {formatHumanDate(workout.startedAt)} · {formatDuration(workout.durationSec)}
            </Text>
          </View>
          <View style={styles.right}>
            <Text variant="h3" accent>{formatVolume(workout.totalVolume, unit)}</Text>
            <Text variant="caption" muted style={styles.sets}>
              {workout.totalSets} sets
            </Text>
          </View>
        </View>
        {workout.notes ? (
          <View style={styles.notesRow}>
            <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
            <Text variant="caption" muted numberOfLines={1} style={styles.notes}>
              {workout.notes}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    marginRight: Spacing.md,
  },
  right: {
    alignItems: 'flex-end',
  },
  date: {
    marginTop: 2,
  },
  sets: {
    marginTop: 2,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  notes: {
    flex: 1,
  },
});
