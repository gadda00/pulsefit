/**
 * Card — surface container used for grouping related content.
 *
 * The dark theme relies on layered surfaces: the app background is #0A0A0A,
 * the card surface is #141414, and elevated cards (modals, bottom sheets)
 * use #1C1C1C. The Card component provides the middle layer.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Radii, Spacing, Shadows } from '@/constants/theme';

export interface CardProps {
  children: React.ReactNode;
  /** Extra padding inside the card. Defaults to Spacing.lg. */
  padding?: keyof typeof Spacing | number;
  /** Visual prominence. `elevated` adds a stronger shadow + lighter surface. */
  elevated?: boolean;
  /** Optional accent stripe on the left edge (used on stat cards). */
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  padding = 'lg',
  elevated = false,
  accentColor,
  style,
  testID,
}: CardProps) {
  const padValue = typeof padding === 'number' ? padding : Spacing[padding];
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        elevated && styles.elevated,
        accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 3 } : null,
        { padding: padValue },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
    ...Shadows.md,
  },
});
