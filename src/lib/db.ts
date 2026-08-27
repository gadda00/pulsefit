/**
 * Local persistence layer for PulseFit, backed by expo-sqlite.
 *
 * The database is a single SQLite file (`pulsefit.db`) stored in the app's
 * private sandbox. We open it synchronously via `openDatabaseSync` (introduced
 * in expo-sqlite 14) which returns a database object whose sync methods are
 * safe to call from the React render path — important because hooks like
 * `useWorkouts` need to return data on the very first render to avoid
 * flashing empty states.
 *
 * Schema:
 *   exercises(id, name, category, equipment, is_rep_based, muscle_groups, is_custom, created_at)
 *   workouts(id, name, started_at, ended_at, duration_sec, total_volume, total_sets, notes)
 *   workout_sets(id, workout_id, exercise_id, set_index, reps, weight, duration_sec, is_pr, completed_at)
 *   body_weight(id, weight, unit, measured_at, note)
 *   scanned_products(id, barcode, name, brand, image_url, calories_per_100g, ...)
 *
 * All write methods return the inserted/updated row id. Read methods return
 * typed rows. Errors bubble up — callers (hooks) decide how to surface them.
 */

import * as SQLite from 'expo-sqlite';
import type {
  BodyWeightEntry,
  Exercise,
  ExerciseCategory,
  Equipment,
  ScannedProduct,
  Workout,
  WorkoutSet,
} from '@/types';
import { SEED_EXERCISES } from '@/constants/exercises';

const DB_NAME = 'pulsefit.db';

let _db: SQLite.SQLiteDatabase | null = null;

/** Open (or create) the database singleton. Safe to call multiple times. */
export function getDb(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync(DB_NAME);
  return _db;
}

/** Replace the active database — used in tests to inject an in-memory mock. */
export function __setDbForTesting(db: SQLite.SQLiteDatabase | null): void {
  _db = db;
}

/** Close the database connection (used by tests to reset state). */
export function closeDb(): void {
  if (_db) {
    try { _db.closeSync(); } catch { /* ignore */ }
    _db = null;
  }
}

/** Run the full schema migration. Idempotent — uses `CREATE TABLE IF NOT EXISTS`. */
export function migrate(): void {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      category      TEXT NOT NULL,
      equipment     TEXT NOT NULL,
      is_rep_based  INTEGER NOT NULL DEFAULT 1,
      muscle_groups TEXT NOT NULL DEFAULT '[]',
      is_custom     INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      started_at    TEXT NOT NULL,
      ended_at      TEXT,
      duration_sec  INTEGER NOT NULL DEFAULT 0,
      total_volume  REAL NOT NULL DEFAULT 0,
      total_sets    INTEGER NOT NULL DEFAULT 0,
      notes         TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id   INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id  INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
      set_index    INTEGER NOT NULL,
      reps         INTEGER,
      weight       REAL,
      duration_sec INTEGER,
      is_pr        INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS body_weight (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      weight      REAL NOT NULL,
      unit        TEXT NOT NULL DEFAULT 'kg',
      measured_at TEXT NOT NULL,
      note        TEXT
    );

    CREATE TABLE IF NOT EXISTS scanned_products (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode            TEXT NOT NULL UNIQUE,
      name               TEXT NOT NULL,
      brand              TEXT,
      image_url          TEXT,
      calories_per_100g  REAL,
      protein_per_100g   REAL,
      carbs_per_100g     REAL,
      fat_per_100g       REAL,
      serving_size       REAL,
      serving_unit       TEXT,
      nutriscore         TEXT,
      scanned_at         TEXT NOT NULL,
      notes              TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at);
    CREATE INDEX IF NOT EXISTS idx_body_weight_measured_at ON body_weight(measured_at);
  `);

  seedExercisesIfEmpty();
}

/** Insert the seed exercise catalogue if the exercises table is empty. */
function seedExercisesIfEmpty(): void {
  const db = getDb();
  const count = db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM exercises');
  if (count && count.c > 0) return;

  const now = new Date().toISOString();
  // Use a single INSERT per exercise rather than a prepared statement — the
  // expo-sqlite 14 API doesn't expose `finalize` on the statement object the
  // way the older one did, and for ~30 rows the overhead is negligible.
  for (const ex of SEED_EXERCISES) {
    db.runSync(
      `INSERT INTO exercises (name, category, equipment, is_rep_based, muscle_groups, is_custom, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ex.name,
        ex.category,
        ex.equipment,
        ex.isRepBased ? 1 : 0,
        JSON.stringify(ex.muscleGroups),
        0,
        now,
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Row mappers — translate SQLite rows (snake_case, integers for booleans)
// into the typed domain objects used throughout the UI.
// ---------------------------------------------------------------------------

function rowToExercise(row: any): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    equipment: row.equipment as Equipment,
    isRepBased: row.is_rep_based === 1,
    muscleGroups: JSON.parse(row.muscle_groups || '[]'),
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
  };
}

function rowToWorkout(row: any): Workout {
  return {
    id: row.id,
    name: row.name,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
    durationSec: row.duration_sec ?? 0,
    totalVolume: row.total_volume ?? 0,
    totalSets: row.total_sets ?? 0,
    notes: row.notes ?? null,
  };
}

function rowToWorkoutSet(row: any): WorkoutSet {
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    setIndex: row.set_index,
    reps: row.reps ?? null,
    weight: row.weight ?? null,
    durationSec: row.duration_sec ?? null,
    isPR: row.is_pr === 1,
    completedAt: row.completed_at,
  };
}

function rowToBodyWeight(row: any): BodyWeightEntry {
  return {
    id: row.id,
    weight: row.weight,
    unit: row.unit,
    measuredAt: row.measured_at,
    note: row.note ?? null,
  };
}

function rowToScannedProduct(row: any): ScannedProduct {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand ?? null,
    imageUrl: row.image_url ?? null,
    caloriesPer100g: row.calories_per_100g ?? null,
    proteinPer100g: row.protein_per_100g ?? null,
    carbsPer100g: row.carbs_per_100g ?? null,
    fatPer100g: row.fat_per_100g ?? null,
    servingSize: row.serving_size ?? null,
    servingUnit: row.serving_unit ?? null,
    nutriscore: row.nutriscore ?? null,
    scannedAt: row.scanned_at,
    notes: row.notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export function getAllExercises(): Exercise[] {
  const rows = getDb().getAllSync<any>('SELECT * FROM exercises ORDER BY name COLLATE NOCASE ASC');
  return rows.map(rowToExercise);
}

export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  const rows = getDb().getAllSync<any>(
    'SELECT * FROM exercises WHERE category = ? ORDER BY name COLLATE NOCASE ASC',
    [category],
  );
  return rows.map(rowToExercise);
}

export function getExerciseById(id: number): Exercise | null {
  const row = getDb().getFirstSync<any>('SELECT * FROM exercises WHERE id = ?', [id]);
  return row ? rowToExercise(row) : null;
}

export function searchExercises(query: string): Exercise[] {
  const q = `%${query.trim()}%`;
  const rows = getDb().getAllSync<any>(
    `SELECT * FROM exercises
     WHERE name LIKE ? OR muscle_groups LIKE ?
     ORDER BY name COLLATE NOCASE ASC`,
    [q, q],
  );
  return rows.map(rowToExercise);
}

export function addExercise(input: {
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  isRepBased: boolean;
  muscleGroups?: string[];
}): Exercise {
  const now = new Date().toISOString();
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO exercises (name, category, equipment, is_rep_based, muscle_groups, is_custom, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [input.name.trim(), input.category, input.equipment, input.isRepBased ? 1 : 0,
     JSON.stringify(input.muscleGroups ?? []), now],
  );
  return {
    id: result.lastInsertRowId as number,
    name: input.name.trim(),
    category: input.category,
    equipment: input.equipment,
    isRepBased: input.isRepBased,
    muscleGroups: input.muscleGroups ?? [],
    isCustom: true,
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export function startWorkout(name: string): Workout {
  const now = new Date().toISOString();
  const result = getDb().runSync(
    'INSERT INTO workouts (name, started_at, ended_at, duration_sec, total_volume, total_sets, notes) VALUES (?, ?, NULL, 0, 0, 0, NULL)',
    [name.trim() || `Workout ${new Date().toLocaleDateString()}`, now],
  );
  return {
    id: result.lastInsertRowId as number,
    name: name.trim() || `Workout ${new Date().toLocaleDateString()}`,
    startedAt: now,
    endedAt: null,
    durationSec: 0,
    totalVolume: 0,
    totalSets: 0,
    notes: null,
  };
}

export function getWorkoutById(id: number): Workout | null {
  const row = getDb().getFirstSync<any>('SELECT * FROM workouts WHERE id = ?', [id]);
  return row ? rowToWorkout(row) : null;
}

export function getAllWorkouts(limit = 50): Workout[] {
  const rows = getDb().getAllSync<any>(
    'SELECT * FROM workouts ORDER BY started_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToWorkout);
}

export function getRecentWorkouts(limit = 5): Workout[] {
  return getAllWorkouts(limit);
}

export function finishWorkout(id: number, notes?: string): void {
  const workout = getWorkoutById(id);
  if (!workout) return;
  const endedAt = new Date().toISOString();
  const durationSec = Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000));
  const sets = getSetsForWorkout(id);
  const totalVolume = sets.reduce((acc, s) => acc + (s.reps != null && s.weight != null ? s.reps * s.weight : 0), 0);

  getDb().runSync(
    `UPDATE workouts SET ended_at = ?, duration_sec = ?, total_volume = ?, total_sets = ?, notes = ? WHERE id = ?`,
    [endedAt, durationSec, totalVolume, sets.length, notes ?? null, id],
  );
}

export function deleteWorkout(id: number): void {
  getDb().runSync('DELETE FROM workout_sets WHERE workout_id = ?', [id]);
  getDb().runSync('DELETE FROM workouts WHERE id = ?', [id]);
}

export function updateWorkoutNotes(id: number, notes: string): void {
  getDb().runSync('UPDATE workouts SET notes = ? WHERE id = ?', [notes, id]);
}

// ---------------------------------------------------------------------------
// Workout sets
// ---------------------------------------------------------------------------

export function addSet(input: {
  workoutId: number;
  exerciseId: number;
  setIndex: number;
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  isPR?: boolean;
}): WorkoutSet {
  const now = new Date().toISOString();
  const result = getDb().runSync(
    `INSERT INTO workout_sets (workout_id, exercise_id, set_index, reps, weight, duration_sec, is_pr, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.workoutId, input.exerciseId, input.setIndex, input.reps, input.weight,
     input.durationSec, input.isPR ? 1 : 0, now],
  );

  // Recompute workout aggregates so the workouts table is always consistent.
  recomputeWorkoutAggregates(input.workoutId);

  return {
    id: result.lastInsertRowId as number,
    workoutId: input.workoutId,
    exerciseId: input.exerciseId,
    setIndex: input.setIndex,
    reps: input.reps,
    weight: input.weight,
    durationSec: input.durationSec,
    isPR: !!input.isPR,
    completedAt: now,
  };
}

export function getSetsForWorkout(workoutId: number): WorkoutSet[] {
  const rows = getDb().getAllSync<any>(
    'SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY set_index ASC, id ASC',
    [workoutId],
  );
  return rows.map(rowToWorkoutSet);
}

export function deleteSet(setId: number, workoutId: number): void {
  getDb().runSync('DELETE FROM workout_sets WHERE id = ?', [setId]);
  recomputeWorkoutAggregates(workoutId);
}

/** Recompute total_volume, total_sets, duration_sec on the parent workout. */
export function recomputeWorkoutAggregates(workoutId: number): void {
  const workout = getWorkoutById(workoutId);
  if (!workout) return;
  const sets = getSetsForWorkout(workoutId);
  const totalVolume = sets.reduce((acc, s) => acc + (s.reps != null && s.weight != null ? s.reps * s.weight : 0), 0);
  const endedAt = workout.endedAt ?? null;
  const durationSec = endedAt
    ? Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000))
    : 0;
  getDb().runSync(
    'UPDATE workouts SET total_volume = ?, total_sets = ?, duration_sec = ? WHERE id = ?',
    [totalVolume, sets.length, durationSec, workoutId],
  );
}

/** Same as `recomputeWorkoutAggregates` but swallows errors — safe to call
 *  from UI handlers where we don't want a single failed write to crash. */
export function recomputeWorkoutAggregatesSafe(workoutId: number): void {
  try { recomputeWorkoutAggregates(workoutId); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Body weight log
// ---------------------------------------------------------------------------

export function logBodyWeight(weight: number, unit: 'kg' | 'lb', note?: string): BodyWeightEntry {
  const now = new Date().toISOString();
  const result = getDb().runSync(
    'INSERT INTO body_weight (weight, unit, measured_at, note) VALUES (?, ?, ?, ?)',
    [weight, unit, now, note ?? null],
  );
  return {
    id: result.lastInsertRowId as number,
    weight,
    unit,
    measuredAt: now,
    note: note ?? null,
  };
}

export function getBodyWeightEntries(limit = 100): BodyWeightEntry[] {
  const rows = getDb().getAllSync<any>(
    'SELECT * FROM body_weight ORDER BY measured_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToBodyWeight);
}

export function getLatestBodyWeight(): BodyWeightEntry | null {
  const row = getDb().getFirstSync<any>(
    'SELECT * FROM body_weight ORDER BY measured_at DESC LIMIT 1',
  );
  return row ? rowToBodyWeight(row) : null;
}

export function deleteBodyWeightEntry(id: number): void {
  getDb().runSync('DELETE FROM body_weight WHERE id = ?', [id]);
}

// ---------------------------------------------------------------------------
// Scanned products
// ---------------------------------------------------------------------------

export function upsertScannedProduct(input: Omit<ScannedProduct, 'id' | 'scannedAt' | 'notes'> & { scannedAt?: string; notes?: string | null }): ScannedProduct {
  const now = input.scannedAt ?? new Date().toISOString();
  const notes = input.notes ?? null;
  const existing = getDb().getFirstSync<any>('SELECT id FROM scanned_products WHERE barcode = ?', [input.barcode]);

  if (existing) {
    getDb().runSync(
      `UPDATE scanned_products SET
         name = ?, brand = ?, image_url = ?, calories_per_100g = ?, protein_per_100g = ?,
         carbs_per_100g = ?, fat_per_100g = ?, serving_size = ?, serving_unit = ?,
         nutriscore = ?, scanned_at = ?, notes = ?
       WHERE barcode = ?`,
      [input.name, input.brand, input.imageUrl, input.caloriesPer100g, input.proteinPer100g,
       input.carbsPer100g, input.fatPer100g, input.servingSize, input.servingUnit,
       input.nutriscore, now, notes, input.barcode],
    );
    const row = getDb().getFirstSync<any>('SELECT * FROM scanned_products WHERE barcode = ?', [input.barcode]);
    return rowToScannedProduct(row);
  }

  const result = getDb().runSync(
    `INSERT INTO scanned_products
       (barcode, name, brand, image_url, calories_per_100g, protein_per_100g,
        carbs_per_100g, fat_per_100g, serving_size, serving_unit, nutriscore, scanned_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.barcode, input.name, input.brand, input.imageUrl, input.caloriesPer100g,
     input.proteinPer100g, input.carbsPer100g, input.fatPer100g, input.servingSize,
     input.servingUnit, input.nutriscore, now, notes],
  );
  const row = getDb().getFirstSync<any>('SELECT * FROM scanned_products WHERE id = ?', [result.lastInsertRowId]);
  return rowToScannedProduct(row);
}

export function getScannedProducts(limit = 50): ScannedProduct[] {
  const rows = getDb().getAllSync<any>(
    'SELECT * FROM scanned_products ORDER BY scanned_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToScannedProduct);
}

export function getScannedProductByBarcode(barcode: string): ScannedProduct | null {
  const row = getDb().getFirstSync<any>('SELECT * FROM scanned_products WHERE barcode = ?', [barcode]);
  return row ? rowToScannedProduct(row) : null;
}

export function deleteScannedProduct(id: number): void {
  getDb().runSync('DELETE FROM scanned_products WHERE id = ?', [id]);
}
