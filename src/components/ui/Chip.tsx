/**
 * Chip — small pill-shaped tag.
 *
 * Used for:
 *  - Exercise category/equipment tags on exercise cards.
 *  - Filter chips on the exercise picker.
 *  - Status indicators ("PR", "Active", "Resting").
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  testID?: string;
}

export function Chip({ label, color, selected = false, onPress, icon, size = 'md', testID }: ChipProps) {
  const bgColor = selected ? (color ?? Colors.primary) : 'transparent';
  const textColor = selected ? '#0A0A0A' : (color ?? Colors.textSecondary);
  const borderColor = selected ? (color ?? Colors.primary) : Colors.border;

  const content = (
    <View style={[
      styles.chip,
      size === 'sm' && styles.chipSm,
      { backgroundColor: bgColor, borderColor, borderWidth: 1.5 },
    ]}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text
        variant={size === 'sm' ? 'caption' : 'body'}
        style={{ color: textColor, fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => pressed ? { opacity: 0.7 } : null}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    gap: Spacing.xs,
  },
  chipSm: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  },
  iconWrap: {
    marginRight: 2,
  },
});
