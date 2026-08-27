/**
 * Tests for src/lib/analytics.ts.
 *
 * Uses the in-memory SQLite mock so we can populate the database with known
 * workouts and verify the analytics queries return correct aggregates.
 */

import {
  getWeeklySummary,
  getVolumeByDay,
  getMuscleGroupSplit,
  getPersonalRecord,
  getAllPersonalRecords,
  getTopExercisesByVolume,
} from '@/lib/analytics';
import { migrate, addSet, startWorkout, finishWorkout, __setDbForTesting, closeDb, getAllExercises } from '@/lib/db';
import { createInMemoryDb } from '@/test/inMemoryDb';
import { toISODate } from '@/lib/utils';

describe('analytics', () => {
  beforeEach(() => {
    __setDbForTesting(createInMemoryDb());
    migrate();
  });

  afterEach(() => closeDb());

  function seedWorkout(volume: number, daysAgo: number) {
    const w = startWorkout(`Workout ${daysAgo}d ago`);
    // Backdate the started_at by manipulating the row directly via db
    const { getDb } = require('@/lib/db');
    const db = getDb();
    const past = new Date();
    past.setDate(past.getDate() - daysAgo);
    past.setHours(10, 0, 0, 0);
    db.runSync('UPDATE workouts SET started_at = ? WHERE id = ?', [past.toISOString(), w.id]);

    // Add a set with the requested volume
    const ex = getAllExercises()[0];
    const reps = 10;
    const weight = volume / reps;
    addSet({ workoutId: w.id, exerciseId: ex.id, setIndex: 0, reps, weight, durationSec: null });

    const ended = new Date(past);
    ended.setHours(11, 0, 0, 0);
    db.runSync('UPDATE workouts SET ended_at = ?, duration_sec = 3600 WHERE id = ?', [ended.toISOString(), w.id]);

    return w;
  }

  describe('getWeeklySummary', () => {
    it('returns zeros for empty database', () => {
      const s = getWeeklySummary();
      expect(s.workoutsCount).toBe(0);
      expect(s.totalVolume).toBe(0);
      expect(s.totalSets).toBe(0);
      expect(s.currentStreak).toBe(0);
      expect(s.lastWorkoutAt).toBeNull();
    });

    it('counts workouts in the last 7 days', () => {
      seedWorkout(800, 0); // today
      seedWorkout(800, 2); // 2 days ago
      const s = getWeeklySummary();
      expect(s.workoutsCount).toBe(2);
      expect(s.totalVolume).toBe(1600);
      expect(s.totalSets).toBe(2);
    });

    it('excludes workouts older than 7 days', () => {
      seedWorkout(800, 0);
      seedWorkout(800, 10); // outside window
      const s = getWeeklySummary();
      expect(s.workoutsCount).toBe(1);
    });

    it('computes avgVolume', () => {
      seedWorkout(500, 0);
      seedWorkout(1000, 1);
      const s = getWeeklySummary();
      expect(s.avgVolume).toBe(750);
    });

    it('detects current streak', () => {
      seedWorkout(800, 0); // today
      const s = getWeeklySummary();
      expect(s.currentStreak).toBe(1);
    });
  });

  describe('getVolumeByDay', () => {
    it('returns 30 entries by default', () => {
      const data = getVolumeByDay(30);
      expect(data.length).toBe(30);
    });

    it('includes zero-volume days for gaps', () => {
      const data = getVolumeByDay(7);
      expect(data.every((d) => d.volume === 0)).toBe(true);
    });

    it('aggregates volume per day', () => {
      seedWorkout(500, 0);
      seedWorkout(300, 0); // second workout same day
      const data = getVolumeByDay(7);
      const today = toISODate(new Date());
      const todayEntry = data.find((d) => d.date === today);
      expect(todayEntry?.volume).toBe(800);
    });
  });

  describe('getMuscleGroupSplit', () => {
    it('returns empty for no data', () => {
      const split = getMuscleGroupSplit(30);
      expect(split).toEqual([]);
    });

    it('groups volume by category', () => {
      const w = startWorkout('Split Test');
      const { getDb } = require('@/lib/db');
      const db = getDb();
      // Backdate to today so it's in the window
      db.runSync('UPDATE workouts SET started_at = ? WHERE id = ?', [new Date().toISOString(), w.id]);

      const exercises = getAllExercises();
      const chest = exercises.find((e) => e.category === 'chest')!;
      const legs = exercises.find((e) => e.category === 'legs')!;
      addSet({ workoutId: w.id, exerciseId: chest.id, setIndex: 0, reps: 10, weight: 80, durationSec: null });
      addSet({ workoutId: w.id, exerciseId: legs.id, setIndex: 0, reps: 10, weight: 100, durationSec: null });

      const split = getMuscleGroupSplit(30);
      expect(split.length).toBe(2);
      const total = split.reduce((a, s) => a + s.volume, 0);
      expect(total).toBe(1800);
      // Percentages should sum to ~100
      const pctSum = split.reduce((a, s) => a + s.percentage, 0);
      expect(pctSum).toBeCloseTo(100, 0);
    });
  });

  describe('getPersonalRecord', () => {
    it('returns null for exercises with no sets', () => {
      const ex = getAllExercises()[0];
      expect(getPersonalRecord(ex.id)).toBeNull();
    });

    it('computes estimated 1RM using Epley formula', () => {
      const w = startWorkout('PR Test');
      const ex = getAllExercises()[0];
      // 100kg x 5 reps => 1RM = 100 * (1 + 5/30) = 116.67
      addSet({ workoutId: w.id, exerciseId: ex.id, setIndex: 0, reps: 5, weight: 100, durationSec: null });
      const pr = getPersonalRecord(ex.id);
      expect(pr).not.toBeNull();
      expect(pr!.weight).toBe(100);
      expect(pr!.reps).toBe(5);
      expect(pr!.estimated1RM).toBeCloseTo(116.67, 1);
    });

    it('picks the highest 1RM across multiple sets', () => {
      const w = startWorkout('PR Multi');
      const ex = getAllExercises()[0];
      // 80kg x 10 => 1RM = 80 * (1 + 10/30) = 106.67
      // 100kg x 5 => 1RM = 100 * (1 + 5/30) = 116.67
      // 90kg x 3  => 1RM = 90 * (1 + 3/30) = 99
      addSet({ workoutId: w.id, exerciseId: ex.id, setIndex: 0, reps: 10, weight: 80, durationSec: null });
      addSet({ workoutId: w.id, exerciseId: ex.id, setIndex: 1, reps: 5, weight: 100, durationSec: null });
      addSet({ workoutId: w.id, exerciseId: ex.id, setIndex: 2, reps: 3, weight: 90, durationSec: null });
      const pr = getPersonalRecord(ex.id);
      expect(pr!.estimated1RM).toBeCloseTo(116.67, 1);
    });
  });

  describe('getAllPersonalRecords', () => {
    it('returns empty array when no sets logged', () => {
      expect(getAllPersonalRecords()).toEqual([]);
    });

    it('returns one PR per exercise, sorted by estimated 1RM desc', () => {
      const w = startWorkout('PRs');
      const exercises = getAllExercises();
      addSet({ workoutId: w.id, exerciseId: exercises[0].id, setIndex: 0, reps: 5, weight: 100, durationSec: null });
      addSet({ workoutId: w.id, exerciseId: exercises[1].id, setIndex: 0, reps: 5, weight: 200, durationSec: null });
      const prs = getAllPersonalRecords();
      expect(prs.length).toBe(2);
      expect(prs[0].estimated1RM).toBeGreaterThan(prs[1].estimated1RM);
    });
  });

  describe('getTopExercisesByVolume', () => {
    it('returns empty for no data', () => {
      expect(getTopExercisesByVolume(30)).toEqual([]);
    });

    it('returns top exercises sorted by volume desc', () => {
      const w = startWorkout('Top Ex');
      const { getDb } = require('@/lib/db');
      const db = getDb();
      db.runSync('UPDATE workouts SET started_at = ? WHERE id = ?', [new Date().toISOString(), w.id]);

      const exercises = getAllExercises();
      addSet({ workoutId: w.id, exerciseId: exercises[0].id, setIndex: 0, reps: 10, weight: 50, durationSec: null }); // 500
      addSet({ workoutId: w.id, exerciseId: exercises[1].id, setIndex: 0, reps: 10, weight: 100, durationSec: null }); // 1000

      const top = getTopExercisesByVolume(30, new Date(), 5);
      expect(top.length).toBe(2);
      expect(top[0].volume).toBeGreaterThan(top[1].volume);
    });
  });
});
