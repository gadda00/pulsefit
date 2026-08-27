/**
 * RestTimerOverlay — full-screen modal that appears when a set is logged.
 *
 * Behaviour:
 *  - Shows a large countdown (MM:SS).
 *  - A circular progress ring fills as the timer counts down.
 *  - "+15s" button extends the rest; "Skip" ends the rest early.
 *  - Fires a haptic notification when the timer hits zero (success) so the
 *    user knows to start their next set even with the phone in their pocket.
 */

import React from 'react';
import { View, StyleSheet, Modal, Pressable, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/constants/theme';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/lib/utils';
import { Text, Button } from '@/components/ui';

export interface RestTimerOverlayProps {
  /** Unix ms when the timer should end. Null = hidden. */
  endsAt: number | null;
  onAddTime?: () => void;
  onSkip?: () => void;
}

export function RestTimerOverlay({ endsAt, onAddTime, onSkip }: RestTimerOverlayProps) {
  const handleComplete = React.useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 200, 100, 200]);
    } catch { /* ignore — haptics not available in tests */ }
  }, []);

  const { remainingSec, progress, isRunning } = useTimer(endsAt, handleComplete);
  const visible = endsAt != null && isRunning;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text variant="label" muted style={styles.label}>REST</Text>
          <Text variant="display" accent style={styles.time}>
            {formatDuration(remainingSec)}
          </Text>

          {/* Progress bar instead of circular ring — simpler, less dependent on SVG quirks. */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add 15 seconds"
              onPress={onAddTime}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
              <Text variant="caption" muted>+15s</Text>
            </Pressable>
            <Button label="Skip" variant="secondary" onPress={onSkip} size="md" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  time: {
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.display * 1.4,
    includeFontPadding: false,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionBtn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
