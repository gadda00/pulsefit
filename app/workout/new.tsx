/**
 * New workout modal — prompts for a workout name, then starts a session.
 *
 * The user can accept the suggested name (auto-generated from today's date)
 * or type their own. Tapping "Start" creates the workout in SQLite via the
 * Zustand store and navigates to the workout detail screen.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Card, Text, TextInput, Button } from '@/components/ui';

export default function NewWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { start } = useActiveWorkout();

  const defaultName = `Workout · ${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}`;
  const [name, setName] = useState(defaultName);

  const handleStart = () => {
    const session = start(name);
    router.replace(`/workout/${session.workout.id}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </Pressable>
        <Text variant="h2" style={{ flex: 1, marginLeft: Spacing.md }}>New Workout</Text>
      </View>

      <View style={styles.body}>
        <Card padding="lg">
          <Text variant="h3" style={{ marginBottom: Spacing.sm }}>Workout Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day, Leg Day, Full Body"
            returnKeyType="done"
            onSubmitEditing={handleStart}
            testID="new-workout-name-input"
          />
          <Text variant="caption" muted style={{ marginTop: Spacing.sm }}>
            Tip: name your workouts after the muscle group or routine so you can find them later.
          </Text>
        </Card>

        <Card padding="lg" style={{ marginTop: Spacing.md }}>
          <Text variant="h3" style={{ marginBottom: Spacing.sm }}>Quick Templates</Text>
          {[
            { name: 'Push Day', emoji: '💥' },
            { name: 'Pull Day', emoji: '🏋️' },
            { name: 'Leg Day', emoji: '🦵' },
            { name: 'Upper Body', emoji: '💪' },
            { name: 'Full Body', emoji: '🔥' },
          ].map((t) => (
            <Pressable
              key={t.name}
              onPress={() => setName(t.name)}
              style={({ pressed }) => [styles.template, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
              <Text variant="body" style={{ flex: 1, marginLeft: Spacing.md }}>{t.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </Card>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button
          label="Start Workout"
          onPress={handleStart}
          size="lg"
          icon={<Ionicons name="play-circle" size={22} color="#0A0A0A" />}
          testID="start-workout-cta"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  body: { flex: 1, paddingHorizontal: Spacing.lg },
  template: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  bottomBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    padding: Spacing.md,
  },
});
