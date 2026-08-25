/**
 * SegmentedControl — segmented selector for picking between 2-4 options.
 *
 * Used by:
 *  - The Progress tab to switch between 7-day / 30-day / 90-day windows.
 *  - The Profile tab to toggle the preferred unit between kg / lb.
 *  - The exercise picker filter row.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Colors, Radii } from '@/constants/theme';
import { Text } from './Text';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, testID }: SegmentedControlProps<T>) {
  return (
    <View testID={testID} style={styles.container}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            testID={`${testID}-${opt.value}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              variant="body"
              style={{ color: selected ? '#0A0A0A' : Colors.textSecondary, fontWeight: '600' }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: Colors.primary,
  },
});
