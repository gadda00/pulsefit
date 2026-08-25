/**
 * Analytics queries for the Progress and Home tabs.
 *
 * All functions are pure reads — they don't mutate the database. They return
 * data shapes ready to drop into chart components (e.g. `VolumeByDay[]` for
 * react-native-chart-kit's line chart).
 */

import { getDb } from './db';
import type { WeeklySummary, VolumeByDay, MuscleGroupSplit, ExerciseCategory } from '@/types';
import { toISODate, computeStreak, percentage } from './utils';

/**
 * Compute the weekly summary for the last 7 days (including today).
 * Returns zeros if no workouts exist in the window.
 */
export function getWeeklySummary(today: Date = new Date()): WeeklySummary {
  const db = getDb();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const rows = db.getAllSync<any>(
    `SELECT * FROM workouts
     WHERE started_at >= ? AND started_at <= ?
     ORDER BY started_at ASC`,
    [start.toISOString(), end.toISOString()],
  );

  const workouts = rows;
  const totalVolume = workouts.reduce((acc, w) => acc + (w.total_volume ?? 0), 0);
  const totalSets = workouts.reduce((acc, w) => acc + (w.total_sets ?? 0), 0);
  const totalDurationSec = workouts.reduce((acc, w) => acc + (w.duration_sec ?? 0), 0);

  // Current streak: consecutive days (ending today or yesterday) with a workout.
  const allDates = db.getAllSync<{ started_at: string }>('SELECT started_at FROM workouts ORDER BY started_at ASC');
  const workoutDates = allDates.map(r => toISODate(r.started_at));
  const streak = computeStreak(workoutDates, today);

  const lastWorkoutAt = workouts.length > 0
    ? workouts[workouts.length - 1].started_at
    : null;

  return {
    workoutsCount: workouts.length,
    totalVolume,
    totalSets,
    totalDurationSec,
    avgVolume: workouts.length > 0 ? Math.round(totalVolume / workouts.length) : 0,
    lastWorkoutAt,
    currentStreak: streak,
  };
}

/**
 * Return volume per day for the last `days` days. Days with no workouts
 * are returned with volume 0 so the chart shows a continuous timeline.
 */
export function getVolumeByDay(days = 30, today: Date = new Date()): VolumeByDay[] {
  const db = getDb();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rows = db.getAllSync<{ date: string; volume: number }>(
    `SELECT strftime('%Y-%m-%d', started_at) AS date, SUM(total_volume) AS volume
     FROM workouts
     WHERE started_at >= ?
     GROUP BY date
     ORDER BY date ASC`,
    [start.toISOString()],
  );

  const volumeByDate = new Map<string, number>();
  for (const r of rows) volumeByDate.set(r.date, r.volume ?? 0);

  // Fill gaps with zero-volume entries for continuous charting.
  const out: VolumeByDay[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < days; i++) {
    const iso = toISODate(cursor);
    out.push({ date: iso, volume: volumeByDate.get(iso) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Return volume distribution across muscle categories for the last N days.
 * Used to draw the donut/progress chart on the Progress tab.
 */
export function getMuscleGroupSplit(days = 30, today: Date = new Date()): MuscleGroupSplit[] {
  const db = getDb();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rows = db.getAllSync<{ category: string; volume: number }>(
    `SELECT e.category AS category, SUM(s.reps * s.weight) AS volume
     FROM workout_sets s
     JOIN workouts w ON w.id = s.workout_id
     JOIN exercises e ON e.id = s.exercise_id
     WHERE w.started_at >= ? AND s.reps IS NOT NULL AND s.weight IS NOT NULL
     GROUP BY e.category
     ORDER BY volume DESC`,
    [start.toISOString()],
  );

  const total = rows.reduce((acc, r) => acc + (r.volume ?? 0), 0);
  return rows.map(r => ({
    category: r.category as ExerciseCategory,
    volume: Math.round(r.volume ?? 0),
    percentage: percentage(r.volume ?? 0, total),
  }));
}

/**
 * Get the personal record for a given exercise: the highest estimated 1RM
 * using the Epley formula (1RM = weight × (1 + reps / 30)).
 *
 * Returns null if no sets have been logged for the exercise.
 */
export function getPersonalRecord(exerciseId: number): { weight: number; reps: number; estimated1RM: number; date: string } | null {
  const db = getDb();
  const rows = db.getAllSync<{ weight: number; reps: number; completed_at: string }>(
    `SELECT s.weight AS weight, s.reps AS reps, s.completed_at AS completed_at
     FROM workout_sets s
     WHERE s.exercise_id = ? AND s.weight IS NOT NULL AND s.reps IS NOT NULL
     ORDER BY s.completed_at ASC`,
    [exerciseId],
  );
  if (rows.length === 0) return null;

  let best = { weight: 0, reps: 0, estimated1RM: 0, date: '' };
  for (const r of rows) {
    const e1rm = r.weight * (1 + r.reps / 30);
    if (e1rm > best.estimated1RM) {
      best = { weight: r.weight, reps: r.reps, estimated1RM: e1rm, date: r.completed_at };
    }
  }
  return best;
}

/**
 * Return the all-time personal records across all exercises.
 * Each entry includes the exercise name so the UI can render a leaderboard.
 */
export function getAllPersonalRecords(): { exerciseId: number; exerciseName: string; weight: number; reps: number; estimated1RM: number; date: string }[] {
  const db = getDb();
  const exercises = db.getAllSync<{ id: number; name: string }>('SELECT id, name FROM exercises ORDER BY name ASC');
  const results: { exerciseId: number; exerciseName: string; weight: number; reps: number; estimated1RM: number; date: string }[] = [];

  for (const ex of exercises) {
    const pr = getPersonalRecord(ex.id);
    if (pr) {
      results.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        ...pr,
      });
    }
  }

  return results.sort((a, b) => b.estimated1RM - a.estimated1RM);
}

/** Get total volume per exercise in the last N days, sorted descending. */
export function getTopExercisesByVolume(days = 30, today: Date = new Date(), limit = 5): { exerciseId: number; exerciseName: string; volume: number; sets: number }[] {
  const db = getDb();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rows = db.getAllSync<{ exercise_id: number; exercise_name: string; volume: number; sets: number }>(
    `SELECT s.exercise_id AS exercise_id, e.name AS exercise_name,
            SUM(s.reps * s.weight) AS volume, COUNT(*) AS sets
     FROM workout_sets s
     JOIN workouts w ON w.id = s.workout_id
     JOIN exercises e ON e.id = s.exercise_id
     WHERE w.started_at >= ? AND s.reps IS NOT NULL AND s.weight IS NOT NULL
     GROUP BY s.exercise_id
     ORDER BY volume DESC
     LIMIT ?`,
    [start.toISOString(), limit],
  );

  return rows.map(r => ({
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    volume: Math.round(r.volume ?? 0),
    sets: r.sets ?? 0,
  }));
}
