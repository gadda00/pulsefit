/**
 * useActiveWorkout — convenience hook around the Zustand workout store.
 *
 * Components subscribe to derived slices so they only re-render when the
 * specific data they care about changes.
 */

import { useWorkoutStore, type ActiveSession } from '@/store/workoutStore';
import type { Exercise, WorkoutSet } from '@/types';
import { useMemo } from 'react';

export function useActiveWorkout() {
  const session = useWorkoutStore((s) => s.session);
  const start = useWorkoutStore((s) => s.start);
  const addSet = useWorkoutStore((s) => s.addSet);
  const removeSet = useWorkoutStore((s) => s.removeSet);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);
  const cancelRestTimer = useWorkoutStore((s) => s.cancelRestTimer);
  const finish = useWorkoutStore((s) => s.finish);
  const hydrate = useWorkoutStore((s) => s.hydrate);

  return {
    session,
    isActive: !!session,
    start,
    addSet,
    removeSet,
    startRestTimer,
    cancelRestTimer,
    finish,
    hydrate,
  };
}

/** Return sets grouped by exercise, in insertion order. */
export function useSetsByExercise(session: ActiveSession | null): Map<number, { exerciseId: number; sets: WorkoutSet[] }> {
  return useMemo(() => {
    if (!session) return new Map();
    const map = new Map<number, WorkoutSet[]>();
    for (const s of session.sets) {
      const bucket = map.get(s.exerciseId);
      if (bucket) bucket.push(s);
      else map.set(s.exerciseId, [s]);
    }
    const out = new Map<number, { exerciseId: number; sets: WorkoutSet[] }>();
    for (const [exerciseId, sets] of map) {
      out.set(exerciseId, { exerciseId, sets });
    }
    return out;
  }, [session]);
}

export type { Exercise };
