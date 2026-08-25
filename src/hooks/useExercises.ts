/**
 * useExercises — search the exercise catalogue.
 *
 * Returns all exercises by default, or filtered by a search query. The hook
 * debounces the query by 150ms to avoid running a SQL LIKE on every keystroke
 * (which would cause UI jank on slower devices).
 */

import { useEffect, useState } from 'react';
import { getAllExercises, searchExercises } from '@/lib/db';
import type { Exercise, ExerciseCategory } from '@/types';

export function useExercises(query: string = '', categoryFilter?: ExerciseCategory | null) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const handle = setTimeout(() => {
      try {
        let result: Exercise[];
        if (query.trim()) {
          result = searchExercises(query);
        } else {
          result = getAllExercises();
        }
        if (categoryFilter) {
          result = result.filter((e) => e.category === categoryFilter);
        }
        if (mounted) {
          setExercises(result);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setExercises([]);
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(handle);
    };
  }, [query, categoryFilter]);

  return { exercises, loading };
}
