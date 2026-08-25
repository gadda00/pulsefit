/**
 * useWorkouts — fetch the list of recent workouts from SQLite.
 *
 * Re-fetches whenever `limit` changes or when an explicit `refreshToken`
 * changes (the caller bumps the token after a mutation to invalidate the cache).
 */

import { useEffect, useState } from 'react';
import { getAllWorkouts, getRecentWorkouts } from '@/lib/db';
import type { Workout } from '@/types';

export function useWorkouts(limit = 50, refreshToken: number = 0) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    try {
      const rows = limit <= 5 ? getRecentWorkouts(limit) : getAllWorkouts(limit);
      if (mounted) {
        setWorkouts(rows);
        setLoading(false);
      }
    } catch {
      if (mounted) {
        setWorkouts([]);
        setLoading(false);
      }
    }
    return () => { mounted = false; };
  }, [limit, refreshToken]);

  return { workouts, loading };
}
