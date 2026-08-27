/**
 * StatCard — large numeric KPI displayed on the Home and Progress screens.
 *
 * Layout:
 *   ┌──────────────────────┐
 *   │  LABEL               │
 *   │  12,345 kg           │   ← big number (variant=display, accent=primary)
 *   │  ▲ 12% vs last week  │   ← optional trend caption
 *   └──────────────────────┘
 *
 * The accent stripe on the left edge visually ties the card to the brand
 * color, which helps the home dashboard read as a cohesive "today" snapshot.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Card } from './Card';
import { Text } from './Text';

export interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  /** Optional small icon (rendered above the value). */
  icon?: React.ReactNode;
  accent?: boolean;
  testID?: string;
}

export function StatCard({ label, value, caption, icon, accent = true, testID }: StatCardProps) {
  return (
    <Card testID={testID} padding="md" accentColor={accent ? Colors.primary : undefined} style={styles.card}>
      <Text variant="label" muted style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text variant="h2" accent={accent} style={styles.value}>{value}</Text>
      </View>
      {caption ? (
        <Text variant="caption" muted style={styles.caption}>{caption}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 100,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  iconWrap: {
    marginRight: 2,
  },
  value: {
    fontSize: Typography.fontSize.xxl,
    includeFontPadding: false,
  },
  caption: {
    marginTop: Spacing.xs,
  },
});
