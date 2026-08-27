/**
 * ProgressBar — horizontal progress bar with optional gradient fill.
 *
 * Used by the rest timer overlay and the muscle-group split donut replacement
 * (a vertical stack of bars reads better than a tiny donut on small screens).
 */

import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii } from '@/constants/theme';

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  height?: number;
  color?: string;
  gradient?: boolean;
  testID?: string;
}

export function ProgressBar({
  progress,
  height = 8,
  color = Colors.primary,
  gradient = true,
  testID,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress));
  // Width must be a DimensionValue (string | number) for RN types.
  const widthPct: DimensionValue = `${pct * 100}%`;

  return (
    <View testID={testID} style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: widthPct }]}>
        {gradient ? (
          <LinearGradient
            colors={[color, Colors.primaryGlow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
});
