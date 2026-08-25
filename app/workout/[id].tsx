/**
 * Workout detail / active session screen.
 *
 * Two modes:
 *  - Active (workout.endedAt === null): the user is in the middle of a
 *    session. We show the live set logger, the exercise picker, and the
 *    Finish button. Each set added starts the rest timer.
 *  - Completed (workout.endedAt !== null): read-only view of the past
 *    workout. Shows the same sets but no add/finish controls.
 *
 * The screen reads from the Zustand store for the active session (so changes
 * appear instantly) and falls back to a direct SQLite query for completed
 * workouts.
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import {
  getWorkoutById,
  getSetsForWorkout,
  getExerciseById,
  getAllExercises,
  deleteWorkout,
} from '@/lib/db';
import { usePreferences } from '@/hooks/usePreferences';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { formatDuration, formatVolume, formatRelativeTime, groupBy } from '@/lib/utils';
import type { Exercise, Workout, WorkoutSet } from '@/types';
import { Card, Text, Button, TextInput, EmptyState } from '@/components/ui';
import { SetRow } from '@/components/workout/SetRow';
import { ExerciseRow } from '@/components/workout/ExerciseRow';
import { RestTimerOverlay } from '@/components/workout/RestTimerOverlay';
import { CATEGORY_LABELS } from '@/constants/exercises';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { prefs } = usePreferences();

  const { session, addSet, removeSet, finish, startRestTimer, cancelRestTimer } = useActiveWorkout();

  // For a completed workout we read directly from SQLite.
  const completedWorkout = useMemo<Workout | null>(
    () => (session?.workout.id === workoutId ? null : getWorkoutById(workoutId)),
    [workoutId, session],
  );
  const completedSets = useMemo<WorkoutSet[]>(
    () => (completedWorkout ? getSetsForWorkout(workoutId) : []),
    [workoutId, completedWorkout],
  );

  const isActive = session?.workout.id === workoutId;
  const workout = isActive ? session!.workout : completedWorkout;
  const sets = isActive ? session!.sets : completedSets;

  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState(workout?.notes ?? '');

  if (!workout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState emoji="❓" title="Workout not found" />
      </View>
    );
  }

  const handleFinish = () => {
    if (!isActive) { router.back(); return; }
    Alert.alert(
      'Finish workout',
      'Save this session to your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => {
            finish(notes.trim() || undefined);
            router.replace('/(tabs)/workouts');
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert('Delete workout', 'Remove this workout permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteWorkout(workoutId);
          router.back();
        },
      },
    ]);
  };

  const grouped = groupBy(sets, (s) => s.exerciseId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={26} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: Spacing.md }}>
          <Text variant="h2" numberOfLines={1}>{workout.name}</Text>
          <Text variant="caption" muted>
            {isActive
              ? `In progress · started ${formatRelativeTime(workout.startedAt)}`
              : formatDuration(workout.durationSec)}
          </Text>
        </View>
        {!isActive ? (
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Summary stats */}
        <View style={styles.summaryRow}>
          <SummaryStat label="Volume" value={formatVolume(workout.totalVolume, prefs.preferredUnit)} />
          <SummaryStat label="Sets" value={String(workout.totalSets)} />
          <SummaryStat label="Duration" value={formatDuration(
            isActive ? Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000) : workout.durationSec
          )} />
        </View>

        {/* Sets grouped by exercise */}
        {grouped.size === 0 ? (
          <EmptyState
            emoji="🏋️"
            title="No sets logged yet"
            subtitle={isActive ? 'Pick an exercise below to start logging.' : 'This workout has no sets.'}
            ctaLabel={isActive ? 'Add Exercise' : undefined}
            onCtaPress={isActive ? () => setShowPicker(true) : undefined}
          />
        ) : (
          <View style={styles.exerciseGroups}>
            {Array.from(grouped.entries()).map(([exerciseId, exSets]) => {
              const exercise = getExerciseById(exerciseId);
              if (!exercise) return null;
              return (
                <Card key={exerciseId} padding="md" style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" numberOfLines={1}>{exercise.name}</Text>
                      <Text variant="caption" muted>{CATEGORY_LABELS[exercise.category]}</Text>
                    </View>
                    {isActive ? (
                      <Pressable onPress={() => setShowPicker(true)} hitSlop={8}>
                        <Text variant="caption" accent>Add set</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.setHeader}>
                    <Text variant="label" muted style={{ flex: 1 }}>SET</Text>
                    <Text variant="label" muted style={{ flex: 1 }}>REPS</Text>
                    <Text variant="label" muted style={{ flex: 1 }}>WEIGHT</Text>
                    {isActive ? <View style={{ width: 28 }} /> : null}
                  </View>
                  {exSets.map((s) => (
                    <SetRow
                      key={s.id}
                      set={s}
                      unit={prefs.preferredUnit}
                      onDelete={isActive ? () => removeSet(s.id) : undefined}
                      testID={`set-row-${s.id}`}
                    />
                  ))}
                </Card>
              );
            })}
          </View>
        )}

        {/* Notes */}
        <Card padding="md" style={styles.notesCard}>
          <Text variant="h3" style={{ marginBottom: Spacing.sm }}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How did the session feel? Anything to remember for next time?"
            multiline
            style={{ height: 80, textAlignVertical: 'top' }}
            testID="workout-notes-input"
          />
        </Card>
      </ScrollView>

      {/* Exercise picker modal */}
      {showPicker ? (
        <ExercisePicker
          onSelect={(ex) => {
            setShowPicker(false);
            handleAddSet(ex);
          }}
          onClose={() => setShowPicker(false)}
        />
      ) : null}

      {/* Rest timer overlay */}
      {isActive && session!.restEndsAt ? (
        <RestTimerOverlay
          endsAt={session!.restEndsAt}
          onAddTime={() => startRestTimer(15)}
          onSkip={cancelRestTimer}
        />
      ) : null}

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        {isActive ? (
          <Button
            label="Finish Workout"
            onPress={handleFinish}
            size="lg"
            icon={<Ionicons name="checkmark-circle" size={22} color="#0A0A0A" />}
            testID="finish-workout-btn"
          />
        ) : (
          <Button label="Done" onPress={() => router.back()} variant="secondary" size="lg" />
        )}
      </View>
    </KeyboardAvoidingView>
  );

  function handleAddSet(exercise: Exercise) {
    // Default values: copy from the last set of this exercise in the session
    // if it exists (most users repeat the same weight for progressive overload).
    const lastSet = sets
      .filter((s) => s.exerciseId === exercise.id)
      .slice(-1)[0];

    const reps = lastSet?.reps ?? (exercise.isRepBased ? 8 : null);
    const weight = lastSet?.weight ?? 0;
    const durationSec = lastSet?.durationSec ?? (!exercise.isRepBased ? 30 : null);

    addSet({ exercise, reps, weight, durationSec });

    if (prefs.hapticsEnabled) {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch { /* ignore */ }
    }

    if (prefs.defaultRestSec > 0) {
      startRestTimer(prefs.defaultRestSec);
    }
  }
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text variant="caption" muted>{label}</Text>
      <Text variant="h3" accent>{value}</Text>
    </View>
  );
}

function ExercisePicker({ onSelect, onClose }: { onSelect: (ex: Exercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const exercises = useMemo(() => {
    const all = getAllExercises();
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.muscleGroups.some((m) => m.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <View style={pickerStyles.overlay}>
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.header}>
          <Text variant="h2">Pick an exercise</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={26} color={Colors.text} />
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises..."
          testID="exercise-search-input"
        />
        <ScrollView style={{ flex: 1 }}>
          {exercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              onPress={() => onSelect(ex)}
              testID={`exercise-row-${ex.id}`}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1, paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  summaryStat: {
    alignItems: 'center',
  },
  exerciseGroups: { gap: Spacing.md, marginTop: Spacing.lg },
  exerciseCard: { marginBottom: Spacing.sm },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  setHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
  },
  notesCard: { marginTop: Spacing.lg },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    padding: Spacing.md,
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
});
