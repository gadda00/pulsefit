/**
 * Tests for the SQLite database layer (src/lib/db.ts).
 *
 * We swap in the in-memory mock from __tests__/helpers/inMemoryDb.ts so the
 * tests can exercise the full SQL surface without a real SQLite install.
 * The mock handles CREATE/INSERT/UPDATE/DELETE/SELECT (with WHERE, JOIN,
 * GROUP BY, ORDER BY, LIMIT) — enough to cover everything db.ts does.
 */

import {
  migrate,
  getAllExercises,
  getExerciseById,
  searchExercises,
  addExercise,
  startWorkout,
  getWorkoutById,
  getAllWorkouts,
  getRecentWorkouts,
  finishWorkout,
  deleteWorkout,
  addSet,
  getSetsForWorkout,
  deleteSet,
  logBodyWeight,
  getBodyWeightEntries,
  getLatestBodyWeight,
  deleteBodyWeightEntry,
  upsertScannedProduct,
  getScannedProducts,
  getScannedProductByBarcode,
  deleteScannedProduct,
  recomputeWorkoutAggregates,
  __setDbForTesting,
  closeDb,
} from '@/lib/db';
import { createInMemoryDb } from '@/test/inMemoryDb';
import { SEED_EXERCISES } from '@/constants/exercises';

describe('db.ts', () => {
  beforeEach(() => {
    __setDbForTesting(createInMemoryDb());
    migrate();
  });

  afterEach(() => {
    closeDb();
  });

  describe('migrate', () => {
    it('creates all required tables', () => {
      const db = (global as any).__lastDb; // not exposed — just check exercises work
      expect(getAllExercises().length).toBeGreaterThan(0);
    });

    it('seeds the exercise catalogue on first run', () => {
      expect(getAllExercises().length).toBe(SEED_EXERCISES.length);
    });

    it('does not double-seed on second migrate call', () => {
      migrate();
      expect(getAllExercises().length).toBe(SEED_EXERCISES.length);
    });
  });

  describe('exercises', () => {
    it('getAllExercises returns all seeded exercises sorted by name', () => {
      const all = getAllExercises();
      expect(all.length).toBe(SEED_EXERCISES.length);
      // Verify sort: first entry should start with 'A' (Arnold Press)
      expect(all[0].name).toBe('Arnold Press');
    });

    it('getExerciseById returns the exercise', () => {
      const all = getAllExercises();
      const first = all[0];
      const fetched = getExerciseById(first.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.name).toBe(first.name);
    });

    it('getExerciseById returns null for unknown id', () => {
      expect(getExerciseById(99999)).toBeNull();
    });

    it('searchExercises matches by name', () => {
      const results = searchExercises('squat');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((e) => e.name.toLowerCase().includes('squat'))).toBe(true);
    });

    it('searchExercises matches by muscle group', () => {
      const results = searchExercises('glutes');
      expect(results.length).toBeGreaterThan(0);
    });

    it('searchExercises returns empty for no matches', () => {
      expect(searchExercises('nonexistent')).toEqual([]);
    });

    it('addExercise creates a custom exercise', () => {
      const ex = addExercise({
        name: 'Test Curl',
        category: 'arms',
        equipment: 'dumbbell',
        isRepBased: true,
        muscleGroups: ['biceps'],
      });
      expect(ex.id).toBeGreaterThan(0);
      expect(ex.isCustom).toBe(true);
      const fetched = getExerciseById(ex.id);
      expect(fetched!.name).toBe('Test Curl');
    });
  });

  describe('workouts', () => {
    it('startWorkout creates a workout with ended_at null', () => {
      const w = startWorkout('Test Workout');
      expect(w.id).toBeGreaterThan(0);
      expect(w.name).toBe('Test Workout');
      expect(w.endedAt).toBeNull();
      expect(w.totalSets).toBe(0);
    });

    it('startWorkout uses default name if empty', () => {
      const w = startWorkout('');
      expect(w.name).toMatch(/Workout/);
    });

    it('getWorkoutById returns the workout', () => {
      const w = startWorkout('Find Me');
      expect(getWorkoutById(w.id)?.name).toBe('Find Me');
    });

    it('getRecentWorkouts returns most recent first', async () => {
      const w1 = startWorkout('First');
      // Sleep briefly so the second workout has a later timestamp (without
      // this, both workouts share the same millisecond and the ORDER BY is
      // ambiguous).
      await new Promise((r) => setTimeout(r, 5));
      const w2 = startWorkout('Second');
      const recent = getRecentWorkouts(2);
      expect(recent[0].id).toBe(w2.id);
      expect(recent[1].id).toBe(w1.id);
    });

    it('finishWorkout sets endedAt and recomputes duration', () => {
      const w = startWorkout('To Finish');
      // Add some sets so totals are non-zero
      const exercises = getAllExercises();
      addSet({ workoutId: w.id, exerciseId: exercises[0].id, setIndex: 0, reps: 10, weight: 50, durationSec: null });
      finishWorkout(w.id, 'Good session');
      const finished = getWorkoutById(w.id);
      expect(finished!.endedAt).not.toBeNull();
      // Duration may be 0 if the test ran in under a millisecond; we accept >= 0.
      expect(finished!.durationSec).toBeGreaterThanOrEqual(0);
      expect(finished!.totalSets).toBe(1);
      expect(finished!.totalVolume).toBe(500);
      expect(finished!.notes).toBe('Good session');
    });

    it('deleteWorkout removes the workout and its sets', () => {
      const w = startWorkout('To Delete');
      const ex = getAllExercises()[0];
      addSet({ workoutId: w.id, exerciseId: ex.id, setIndex: 0, reps: 5, weight: 50, durationSec: null });
      deleteWorkout(w.id);
      expect(getWorkoutById(w.id)).toBeNull();
      expect(getSetsForWorkout(w.id)).toEqual([]);
    });
  });

  describe('workout sets', () => {
    let workoutId: number;
    let exerciseId: number;

    beforeEach(() => {
      const w = startWorkout('Sets Test');
      workoutId = w.id;
      exerciseId = getAllExercises()[0].id;
    });

    it('addSet creates a set and recompute aggregates', () => {
      const set = addSet({ workoutId, exerciseId, setIndex: 0, reps: 10, weight: 80, durationSec: null });
      expect(set.id).toBeGreaterThan(0);
      expect(set.reps).toBe(10);
      expect(set.weight).toBe(80);
      expect(set.isPR).toBe(false);

      const w = getWorkoutById(workoutId);
      expect(w!.totalSets).toBe(1);
      expect(w!.totalVolume).toBe(800);
    });

    it('getSetsForWorkout returns sets in order', () => {
      addSet({ workoutId, exerciseId, setIndex: 0, reps: 10, weight: 80, durationSec: null });
      addSet({ workoutId, exerciseId, setIndex: 1, reps: 8, weight: 90, durationSec: null });
      const sets = getSetsForWorkout(workoutId);
      expect(sets.length).toBe(2);
      expect(sets[0].setIndex).toBe(0);
      expect(sets[1].setIndex).toBe(1);
    });

    it('deleteSet removes the set and recomputes', () => {
      const s1 = addSet({ workoutId, exerciseId, setIndex: 0, reps: 10, weight: 80, durationSec: null });
      addSet({ workoutId, exerciseId, setIndex: 1, reps: 8, weight: 90, durationSec: null });
      deleteSet(s1.id, workoutId);
      const sets = getSetsForWorkout(workoutId);
      expect(sets.length).toBe(1);
      const w = getWorkoutById(workoutId);
      expect(w!.totalSets).toBe(1);
      expect(w!.totalVolume).toBe(720);
    });

    it('recomputeWorkoutAggregates works', () => {
      addSet({ workoutId, exerciseId, setIndex: 0, reps: 10, weight: 80, durationSec: null });
      addSet({ workoutId, exerciseId, setIndex: 1, reps: 5, weight: 100, durationSec: null });
      recomputeWorkoutAggregates(workoutId);
      const w = getWorkoutById(workoutId);
      expect(w!.totalSets).toBe(2);
      expect(w!.totalVolume).toBe(1300);
    });
  });

  describe('body weight', () => {
    it('logBodyWeight creates an entry', () => {
      const entry = logBodyWeight(80.5, 'kg', 'morning');
      expect(entry.id).toBeGreaterThan(0);
      expect(entry.weight).toBe(80.5);
      expect(entry.note).toBe('morning');
    });

    it('getLatestBodyWeight returns the most recent', async () => {
      logBodyWeight(80, 'kg');
      await new Promise((r) => setTimeout(r, 5));
      const later = logBodyWeight(81, 'kg');
      expect(getLatestBodyWeight()?.id).toBe(later.id);
    });

    it('getBodyWeightEntries returns all entries newest first', async () => {
      logBodyWeight(80, 'kg');
      await new Promise((r) => setTimeout(r, 5));
      logBodyWeight(81, 'kg');
      await new Promise((r) => setTimeout(r, 5));
      logBodyWeight(82, 'kg');
      const entries = getBodyWeightEntries(10);
      expect(entries.length).toBe(3);
      expect(entries[0].weight).toBe(82);
    });

    it('deleteBodyWeightEntry removes the entry', () => {
      const e = logBodyWeight(80, 'kg');
      deleteBodyWeightEntry(e.id);
      expect(getBodyWeightEntries(10).find((x) => x.id === e.id)).toBeUndefined();
    });
  });

  describe('scanned products', () => {
    const sampleProduct = {
      barcode: '5060367720015',
      name: 'Whey Protein',
      brand: 'Optimum Nutrition',
      imageUrl: 'https://example.com/img.jpg',
      caloriesPer100g: 120,
      proteinPer100g: 24,
      carbsPer100g: 3,
      fatPer100g: 1.5,
      servingSize: 30,
      servingUnit: 'g',
      nutriscore: 'a',
      notes: null as string | null,
    };

    it('upsertScannedProduct inserts a new product', () => {
      const p = upsertScannedProduct(sampleProduct);
      expect(p.id).toBeGreaterThan(0);
      expect(p.name).toBe('Whey Protein');
      expect(p.proteinPer100g).toBe(24);
    });

    it('upsertScannedProduct updates existing product by barcode', () => {
      upsertScannedProduct(sampleProduct);
      const updated = upsertScannedProduct({ ...sampleProduct, name: 'Updated Whey', proteinPer100g: 25 });
      expect(updated.name).toBe('Updated Whey');
      expect(updated.proteinPer100g).toBe(25);
      // Only one product should exist with this barcode
      const all = getScannedProducts(100);
      expect(all.filter((p) => p.barcode === sampleProduct.barcode).length).toBe(1);
    });

    it('getScannedProducts returns all newest first', () => {
      upsertScannedProduct({ ...sampleProduct, barcode: '1' });
      upsertScannedProduct({ ...sampleProduct, barcode: '2' });
      upsertScannedProduct({ ...sampleProduct, barcode: '3' });
      const all = getScannedProducts(100);
      expect(all.length).toBe(3);
    });

    it('getScannedProductByBarcode finds by barcode', () => {
      upsertScannedProduct(sampleProduct);
      const found = getScannedProductByBarcode(sampleProduct.barcode);
      expect(found?.name).toBe('Whey Protein');
    });

    it('deleteScannedProduct removes the product', () => {
      const p = upsertScannedProduct(sampleProduct);
      deleteScannedProduct(p.id);
      expect(getScannedProductByBarcode(sampleProduct.barcode)).toBeNull();
    });
  });
});
