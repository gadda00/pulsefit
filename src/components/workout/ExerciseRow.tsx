/**
 * ExerciseRow — list item for a single exercise in the picker or catalogue.
 *
 * Renders the exercise name, category chip, equipment chip, and (optionally)
 * the user's all-time PR for the exercise so they can quickly see their best
 * lift while building a routine.
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { CATEGORY_LABELS as CAT_LABELS, EQUIPMENT_LABELS as EQ_LABELS } from '@/constants/exercises';
import type { Exercise, WeightUnit } from '@/types';
import { formatWeight } from '@/lib/utils';
import { Card, Text, Chip } from '@/components/ui';

export interface ExerciseRowProps {
  exercise: Exercise;
  unit?: WeightUnit;
  /** Optional personal record to display on the right side. */
  prWeight?: number | null;
  onPress?: () => void;
  testID?: string;
}

export function ExerciseRow({ exercise, unit = 'kg', prWeight, onPress, testID }: ExerciseRowProps) {
  const inner = (
    <Card padding="md" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text variant="body" semibold numberOfLines={1}>{exercise.name}</Text>
          <View style={styles.chipsRow}>
            <Chip
              label={CAT_LABELS[exercise.category]}
              color={Colors.category[exercise.category]}
              size="sm"
            />
            <Chip
              label={EQ_LABELS[exercise.equipment]}
              size="sm"
            />
          </View>
        </View>
        {prWeight != null ? (
          <View style={styles.right}>
            <Text variant="caption" muted>PR</Text>
            <Text variant="body" accent semibold>{formatWeight(prWeight, unit)}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={exercise.name}
      onPress={onPress}
      style={({ pressed }) => pressed ? { opacity: 0.85 } : null}
    >
      {inner}
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
    alignItems: 'center',
  },
  left: {
    flex: 1,
    marginRight: Spacing.md,
  },
  right: {
    alignItems: 'flex-end',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
});
