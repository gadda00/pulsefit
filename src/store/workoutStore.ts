/**
 * Active workout session store (Zustand).
 *
 * Holds the currently in-progress workout (if any) and the local list of
 * sets the user has logged during this session. The store is the single
 * source of truth for the Active Workout screen — components subscribe to
 * slices of state instead of re-querying SQLite on every render.
 *
 * On app launch we check SQLite for any workout with `ended_at IS NULL`;
 * if found, we resume it. This prevents data loss if the user force-quits
 * the app mid-workout.
 */

import { create } from 'zustand';
import {
  addSet as dbAddSet,
  finishWorkout as dbFinishWorkout,
  getSetsForWorkout,
  getWorkoutById,
  recomputeWorkoutAggregatesSafe,
  startWorkout as dbStartWorkout,
  deleteSet as dbDeleteSet,
} from '@/lib/db';
import type { Exercise, Workout, WorkoutSet } from '@/types';

export interface ActiveSession {
  workout: Workout;
  sets: WorkoutSet[];
  /** Set the rest timer should count down from when the next set is logged. */
  restSec: number;
  /** Unix ms when the current rest timer ends, or null if no timer running. */
  restEndsAt: number | null;
}

interface WorkoutStore {
  session: ActiveSession | null;
  /** True while we're checking SQLite for an in-progress workout. */
  hydrating: boolean;

  /** Re-hydrate the active session from SQLite. Call on app launch. */
  hydrate: () => void;

  /** Start a brand new workout. If one is already active, it stays active. */
  start: (name: string) => ActiveSession;

  /** Add a set to the active workout. Returns the new set. */
  addSet: (input: {
    exercise: Exercise;
    reps: number | null;
    weight: number | null;
    durationSec: number | null;
    isPR?: boolean;
  }) => WorkoutSet | null;

  /** Remove a set from the active workout by id. */
  removeSet: (setId: number) => void;

  /** Start the rest timer for `seconds` (default 90). */
  startRestTimer: (seconds?: number) => void;

  /** Cancel the rest timer. */
  cancelRestTimer: () => void;

  /** Finish the active workout and clear the session. */
  finish: (notes?: string) => void;

  /** Replace the entire session (used by tests). */
  __setSession: (session: ActiveSession | null) => void;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  session: null,
  hydrating: true,

  hydrate: () => {
    try {
      // Find an unfinished workout (most recent first).
      // We use a direct SQL query via the db module instead of importing
      // SQLite here to keep this store testable.
      const workouts = getAllUnfinishedWorkouts();
      if (workouts.length === 0) {
        set({ session: null, hydrating: false });
        return;
      }
      const workout = workouts[0];
      const sets = getSetsForWorkout(workout.id);
      set({
        session: {
          workout,
          sets,
          restSec: 90,
          restEndsAt: null,
        },
        hydrating: false,
      });
    } catch {
      set({ session: null, hydrating: false });
    }
  },

  start: (name) => {
    const existing = get().session;
    if (existing) return existing;
    const workout = dbStartWorkout(name);
    const session: ActiveSession = {
      workout,
      sets: [],
      restSec: 90,
      restEndsAt: null,
    };
    set({ session });
    return session;
  },

  addSet: ({ exercise, reps, weight, durationSec, isPR }) => {
    const session = get().session;
    if (!session) return null;

    // Compute next set index scoped to this exercise within the workout.
    const sameExercise = session.sets.filter(s => s.exerciseId === exercise.id);
    const setIndex = sameExercise.length > 0
      ? Math.max(...sameExercise.map(s => s.setIndex)) + 1
      : 0;

    const newSet = dbAddSet({
      workoutId: session.workout.id,
      exerciseId: exercise.id,
      setIndex,
      reps,
      weight,
      durationSec,
      isPR,
    });

    const updatedSets = [...session.sets, newSet];
    // Recompute aggregates so the workouts table reflects the new set immediately.
    recomputeWorkoutAggregatesSafe(session.workout.id);

    const updatedWorkout = getWorkoutById(session.workout.id) ?? session.workout;
    set({
      session: {
        ...session,
        workout: updatedWorkout,
        sets: updatedSets,
        restEndsAt: session.restSec > 0 ? Date.now() + session.restSec * 1000 : null,
      },
    });
    return newSet;
  },

  removeSet: (setId) => {
    const session = get().session;
    if (!session) return;
    dbDeleteSet(setId, session.workout.id);
    const updatedSets = session.sets.filter(s => s.id !== setId);
    recomputeWorkoutAggregatesSafe(session.workout.id);
    const updatedWorkout = getWorkoutById(session.workout.id) ?? session.workout;
    set({ session: { ...session, sets: updatedSets, workout: updatedWorkout } });
  },

  startRestTimer: (seconds) => {
    const session = get().session;
    if (!session) return;
    const sec = seconds ?? session.restSec;
    set({ session: { ...session, restSec: sec, restEndsAt: Date.now() + sec * 1000 } });
  },

  cancelRestTimer: () => {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, restEndsAt: null } });
  },

  finish: (notes) => {
    const session = get().session;
    if (!session) return;
    dbFinishWorkout(session.workout.id, notes);
    set({ session: null });
  },

  __setSession: (session) => set({ session, hydrating: false }),
}));

/** Helper: return all unfinished workouts (ended_at IS NULL), most-recent first. */
function getAllUnfinishedWorkouts(): Workout[] {
  // We import here to avoid a circular dep at module load time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getDb } = require('@/lib/db') as typeof import('@/lib/db');
  try {
    const db = getDb();
    const rows = db.getAllSync<any>(
      'SELECT * FROM workouts WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      startedAt: r.started_at,
      endedAt: r.ended_at ?? null,
      durationSec: r.duration_sec ?? 0,
      totalVolume: r.total_volume ?? 0,
      totalSets: r.total_sets ?? 0,
      notes: r.notes ?? null,
    }));
  } catch {
    return [];
  }
}
