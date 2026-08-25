/**
 * Core domain types for PulseFit.
 *
 * These mirror the rows stored in the local SQLite database (see `src/lib/db.ts`).
 * Keep this file free of runtime imports — it's pure types so it can be imported
 * from anywhere (UI, hooks, store, tests) without pulling in side effects.
 */

export type ID = number;

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'fullbody';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'cable'
  | 'band'
  | 'other';

export type WeightUnit = 'kg' | 'lb';

/**
 * An exercise definition. Seed data lives in `src/constants/exercises.ts`.
 * Exercises are immutable from the UI; users can't edit them (only add custom
 * ones, which still conform to this shape).
 */
export interface Exercise {
  id: ID;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  /** True if the exercise is measured by reps (e.g. squat); false if by duration (e.g. plank). */
  isRepBased: boolean;
  /** Optional secondary muscle groups for filtering / future analytics. */
  muscleGroups: string[];
  /** True if this exercise was added by the user (not from the seed catalogue). */
  isCustom?: boolean;
  /** ISO timestamp the exercise was created. */
  createdAt: string;
}

/**
 * A single set logged during a workout session.
 * Either `reps` or `durationSec` will be meaningful depending on the parent
 * exercise's `isRepBased` flag. We keep both columns in storage to simplify
 * the schema.
 */
export interface WorkoutSet {
  id: ID;
  workoutId: ID;
  exerciseId: ID;
  setIndex: number;
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  /** True if the user marked this set as a personal record. */
  isPR: boolean;
  /** ISO timestamp when the set was completed. */
  completedAt: string;
}

/**
 * A workout session. Has many sets via `WorkoutSet.workoutId`.
 * The `startedAt` / `endedAt` pair lets us compute session duration; if
 * `endedAt` is null the workout is still in progress.
 */
export interface Workout {
  id: ID;
  name: string;
  startedAt: string;
  endedAt: string | null;
  /** Total duration in seconds, derived from endedAt - startedAt. */
  durationSec: number;
  /** Total volume (sum of reps × weight) for analytics. */
  totalVolume: number;
  /** Number of sets completed. */
  totalSets: number;
  notes: string | null;
}

/**
 * An entry in the user's body-weight log. Used by the Progress tab to draw
 * a body-weight-over-time chart.
 */
export interface BodyWeightEntry {
  id: ID;
  weight: number;
  unit: WeightUnit;
  measuredAt: string;
  note: string | null;
}

/**
 * A scanned product captured via the Camera tab. The `barcode` is the unique
 * key; re-scanning the same barcode updates the cached row instead of creating
 * a duplicate.
 */
export interface ScannedProduct {
  id: ID;
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  servingSize: number | null;
  servingUnit: string | null;
  nutriscore: string | null;
  scannedAt: string;
  notes: string | null;
}

/**
 * User preferences persisted in AsyncStorage (not SQLite — they're a small
 * flat object, so the JSON blob approach is simpler).
 */
export interface UserPreferences {
  preferredUnit: WeightUnit;
  userName: string;
  /** Target body weight in `preferredUnit`; null = no goal set. */
  targetBodyWeight: number | null;
  /** Enable rest-timer haptic feedback when a set is logged. */
  hapticsEnabled: boolean;
  /** Default rest time in seconds, used when starting a new set. */
  defaultRestSec: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  preferredUnit: 'kg',
  userName: '',
  targetBodyWeight: null,
  hapticsEnabled: true,
  defaultRestSec: 90,
};

/**
 * Aggregated metrics used by the Home dashboard and Progress charts.
 * Computed by `src/lib/analytics.ts` from raw workout data.
 */
export interface WeeklySummary {
  workoutsCount: number;
  totalVolume: number;
  totalSets: number;
  totalDurationSec: number;
  /** Average volume per workout. */
  avgVolume: number;
  /** ISO date of the most recent workout, or null if none. */
  lastWorkoutAt: string | null;
  /** Number of consecutive days with at least one workout, ending today. */
  currentStreak: number;
}

export interface VolumeByDay {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Total volume (reps × weight) performed on that day. */
  volume: number;
}

export interface MuscleGroupSplit {
  category: ExerciseCategory;
  /** Total volume allocated to this category in the selected window. */
  volume: number;
  /** Percentage of total volume (0-100). */
  percentage: number;
}
