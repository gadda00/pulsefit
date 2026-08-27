/**
 * MuscleSplitChart — horizontal bar chart of volume per muscle category.
 *
 * Renders one row per category that has volume > 0, with a coloured bar
 * proportional to the category's share of total volume. The category color
 * matches the chip color used elsewhere, so the chart reads as part of the
 * design system rather than a third-party chart-kit default.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { CATEGORY_LABELS } from '@/constants/exercises';
import type { MuscleGroupSplit } from '@/types';
import { Text, ProgressBar } from '@/components/ui';

export interface MuscleSplitChartProps {
  data: MuscleGroupSplit[];
  testID?: string;
}

export function MuscleSplitChart({ data, testID }: MuscleSplitChartProps) {
  if (data.length === 0) {
    return (
      <View testID={testID} style={styles.empty}>
        <Text variant="body" muted center>No muscle group data yet.</Text>
      </View>
    );
  }

  return (
    <View testID={testID} style={styles.container}>
      {data.map((row) => {
        const color = Colors.category[row.category] ?? Colors.primary;
        return (
          <View key={row.category} style={styles.row}>
            <View style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text variant="body" style={{ flex: 1 }}>{CATEGORY_LABELS[row.category]}</Text>
              <Text variant="caption" muted>{row.percentage}%</Text>
            </View>
            <ProgressBar progress={row.percentage / 100} color={color} gradient={false} height={6} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  row: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  empty: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
});
