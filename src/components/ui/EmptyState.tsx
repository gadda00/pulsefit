/**
 * EmptyState — placeholder shown when a list has no items.
 *
 * Used on the Home, Workouts, Progress, and Scan tabs before the user has
 * logged any data. Each instance picks an emoji-style icon, a headline, a
 * short subtitle, and an optional CTA button.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';
import { Text } from './Text';
import { Button } from './Button';

export interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  testID?: string;
}

export function EmptyState({ emoji, title, subtitle, ctaLabel, onCtaPress, testID }: EmptyStateProps) {
  return (
    <View testID={testID} style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text variant="h2" center style={styles.title}>{title}</Text>
      {subtitle ? (
        <Text variant="body" muted center style={styles.subtitle}>{subtitle}</Text>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <Button label={ctaLabel} onPress={onCtaPress} style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  cta: {
    minWidth: 200,
  },
});
