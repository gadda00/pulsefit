/**
 * Tests for the Zustand workout store.
 *
 * Uses the in-memory SQLite mock so we can exercise the full start → addSet
 * → finish lifecycle without a real database.
 */

import { useWorkoutStore } from '@/store/workoutStore';
import { migrate, __setDbForTesting, closeDb, getWorkoutById, getSetsForWorkout, getAllExercises } from '@/lib/db';
import { createInMemoryDb } from '@/test/inMemoryDb';

describe('workoutStore', () => {
  beforeEach(() => {
    __setDbForTesting(createInMemoryDb());
    migrate();
    useWorkoutStore.setState({ session: null, hydrating: false });
  });

  afterEach(() => {
    closeDb();
    useWorkoutStore.setState({ session: null, hydrating: false });
  });

  it('starts a new workout', () => {
    const { start } = useWorkoutStore.getState();
    const session = start('Test Workout');
    expect(session.workout.name).toBe('Test Workout');
    expect(session.workout.endedAt).toBeNull();
    expect(session.sets).toEqual([]);
    expect(useWorkoutStore.getState().session).not.toBeNull();
  });

  it('does not start a new workout if one is already active', () => {
    const { start } = useWorkoutStore.getState();
    const first = start('First');
    const second = start('Second');
    expect(second.workout.id).toBe(first.workout.id);
    expect(second.workout.name).toBe('First');
  });

  it('adds a set to the active workout', () => {
    const { start, addSet } = useWorkoutStore.getState();
    start('Sets Test');
    const exercise = getAllExercises()[0];
    const set = addSet({ exercise, reps: 10, weight: 80, durationSec: null });
    expect(set).not.toBeNull();
    expect(set!.reps).toBe(10);
    expect(set!.weight).toBe(80);
    expect(set!.setIndex).toBe(0);

    const session = useWorkoutStore.getState().session!;
    expect(session.sets.length).toBe(1);
  });

  it('increments setIndex for the same exercise', () => {
    const { start, addSet } = useWorkoutStore.getState();
    start('Sets Test');
    const exercise = getAllExercises()[0];
    const s1 = addSet({ exercise, reps: 10, weight: 80, durationSec: null });
    const s2 = addSet({ exercise, reps: 8, weight: 90, durationSec: null });
    expect(s1!.setIndex).toBe(0);
    expect(s2!.setIndex).toBe(1);
  });

  it('removes a set', () => {
    const { start, addSet, removeSet } = useWorkoutStore.getState();
    start('Remove Test');
    const exercise = getAllExercises()[0];
    const s1 = addSet({ exercise, reps: 10, weight: 80, durationSec: null });
    addSet({ exercise, reps: 8, weight: 90, durationSec: null });
    removeSet(s1!.id);
    const session = useWorkoutStore.getState().session!;
    expect(session.sets.length).toBe(1);
    expect(session.sets[0].id).not.toBe(s1!.id);
  });

  it('starts the rest timer', () => {
    const { start, startRestTimer } = useWorkoutStore.getState();
    start('Timer Test');
    startRestTimer(90);
    const session = useWorkoutStore.getState().session!;
    expect(session.restSec).toBe(90);
    expect(session.restEndsAt).not.toBeNull();
    expect(session.restEndsAt).toBeGreaterThan(Date.now());
  });

  it('cancels the rest timer', () => {
    const { start, startRestTimer, cancelRestTimer } = useWorkoutStore.getState();
    start('Cancel Timer');
    startRestTimer(60);
    cancelRestTimer();
    const session = useWorkoutStore.getState().session!;
    expect(session.restEndsAt).toBeNull();
  });

  it('finishes the workout and clears the session', () => {
    const { start, addSet, finish } = useWorkoutStore.getState();
    const session = start('Finish Test');
    const exercise = getAllExercises()[0];
    addSet({ exercise, reps: 10, weight: 80, durationSec: null });

    finish('Great workout');

    expect(useWorkoutStore.getState().session).toBeNull();

    const w = getWorkoutById(session.workout.id);
    expect(w?.endedAt).not.toBeNull();
    expect(w?.totalSets).toBe(1);
    expect(w?.notes).toBe('Great workout');
  });

  it('persists sets to SQLite on add', () => {
    const { start, addSet } = useWorkoutStore.getState();
    const session = start('Persist Test');
    const exercise = getAllExercises()[0];
    addSet({ exercise, reps: 10, weight: 80, durationSec: null });

    const dbSets = getSetsForWorkout(session.workout.id);
    expect(dbSets.length).toBe(1);
    expect(dbSets[0].reps).toBe(10);
  });

  it('recomputes workout aggregates after addSet', () => {
    const { start, addSet } = useWorkoutStore.getState();
    const session = start('Agg Test');
    const exercise = getAllExercises()[0];
    addSet({ exercise, reps: 10, weight: 80, durationSec: null });

    const w = getWorkoutById(session.workout.id);
    expect(w?.totalSets).toBe(1);
    expect(w?.totalVolume).toBe(800);
  });
});
