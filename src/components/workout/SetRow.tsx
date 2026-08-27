/**
 * SetRow — single row in the active workout's set logger.
 *
 * Each row shows: set number, reps, weight, duration, and a delete button.
 * Rows are display-only; the input form lives above the list. The PR badge
 * appears on sets the user marked (or the system detected) as a personal record.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radii } from '@/constants/theme';
import type { WorkoutSet, WeightUnit } from '@/types';
import { formatWeight, formatDuration } from '@/lib/utils';
import { Text } from '@/components/ui';

export interface SetRowProps {
  set: WorkoutSet;
  unit?: WeightUnit;
  onDelete?: () => void;
  testID?: string;
}

export function SetRow({ set, unit = 'kg', onDelete, testID }: SetRowProps) {
  return (
    <View testID={testID} style={styles.row}>
      <View style={styles.setIndex}>
        <Text variant="caption" muted>SET</Text>
        <Text variant="body" semibold>{set.setIndex + 1}</Text>
      </View>

      <View style={styles.metric}>
        <Text variant="caption" muted>REPS</Text>
        <Text variant="body" semibold>{set.reps ?? '—'}</Text>
      </View>

      <View style={styles.metric}>
        <Text variant="caption" muted>WEIGHT</Text>
        <Text variant="body" semibold>{set.weight != null ? formatWeight(set.weight, unit) : '—'}</Text>
      </View>

      {set.durationSec != null ? (
        <View style={styles.metric}>
          <Text variant="caption" muted>TIME</Text>
          <Text variant="body" semibold>{formatDuration(set.durationSec)}</Text>
        </View>
      ) : null}

      {set.isPR ? (
        <View style={styles.prBadge}>
          <Text variant="label" style={styles.prText}>PR</Text>
        </View>
      ) : null}

      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete set"
          onPress={onDelete}
          hitSlop={8}
          style={styles.deleteBtn}
        >
          <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  setIndex: {
    minWidth: 40,
  },
  metric: {
    flex: 1,
  },
  prBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  prText: {
    color: '#0A0A0A',
    fontSize: Typography.fontSize.xs,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
});
