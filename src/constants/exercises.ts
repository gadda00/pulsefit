import type { Exercise, ExerciseCategory, Equipment } from '@/types';

/**
 * Seed catalogue of exercises.
 *
 * 32 exercises spanning every muscle category and equipment type, so the user
 * can start logging workouts immediately without first having to define their
 * own exercise list. Custom exercises added by the user are appended at
 * runtime (see `src/lib/db.ts -> addExercise`).
 *
 * IDs are stable: they're written to the DB on first launch and used as
 * foreign keys by workout sets. Do not renumber existing entries.
 */
type SeedExercise = Omit<Exercise, 'id' | 'createdAt'>;

const S = (
  name: string,
  category: ExerciseCategory,
  equipment: Equipment,
  isRepBased: boolean,
  muscleGroups: string[],
): SeedExercise => ({ name, category, equipment, isRepBased, muscleGroups });

export const SEED_EXERCISES: SeedExercise[] = [
  // Chest
  S('Barbell Bench Press', 'chest', 'barbell', true, ['pectorals', 'triceps', 'front delts']),
  S('Incline Dumbbell Press', 'chest', 'dumbbell', true, ['upper pectorals', 'front delts']),
  S('Dumbbell Fly', 'chest', 'dumbbell', true, ['pectorals']),
  S('Push-up', 'chest', 'bodyweight', true, ['pectorals', 'triceps', 'core']),
  S('Cable Crossover', 'chest', 'cable', true, ['pectorals']),

  // Back
  S('Pull-up', 'back', 'bodyweight', true, ['lats', 'biceps', 'rhomboids']),
  S('Bent-over Barbell Row', 'back', 'barbell', true, ['lats', 'rhomboids', 'traps']),
  S('Lat Pulldown', 'back', 'cable', true, ['lats', 'biceps']),
  S('Seated Cable Row', 'back', 'cable', true, ['lats', 'rhomboids']),
  S('Dumbbell Shrug', 'back', 'dumbbell', true, ['traps']),

  // Shoulders
  S('Overhead Press', 'shoulders', 'barbell', true, ['front delts', 'triceps']),
  S('Dumbbell Lateral Raise', 'shoulders', 'dumbbell', true, ['side delts']),
  S('Face Pull', 'shoulders', 'cable', true, ['rear delts', 'traps']),
  S('Arnold Press', 'shoulders', 'dumbbell', true, ['front delts', 'side delts']),

  // Arms
  S('Barbell Curl', 'arms', 'barbell', true, ['biceps']),
  S('Dumbbell Hammer Curl', 'arms', 'dumbbell', true, ['biceps', 'brachialis']),
  S('Triceps Pushdown', 'arms', 'cable', true, ['triceps']),
  S('Skull Crusher', 'arms', 'barbell', true, ['triceps']),
  S('Dips', 'arms', 'bodyweight', true, ['triceps', 'chest', 'front delts']),

  // Legs
  S('Barbell Back Squat', 'legs', 'barbell', true, ['quads', 'glutes', 'hamstrings']),
  S('Romanian Deadlift', 'legs', 'barbell', true, ['hamstrings', 'glutes', 'lower back']),
  S('Walking Lunge', 'legs', 'dumbbell', true, ['quads', 'glutes']),
  S('Leg Press', 'legs', 'machine', true, ['quads', 'glutes']),
  S('Calf Raise', 'legs', 'machine', true, ['calves']),
  S('Goblet Squat', 'legs', 'kettlebell', true, ['quads', 'glutes']),

  // Core
  S('Plank', 'core', 'bodyweight', false, ['abs', 'core']),
  S('Hanging Leg Raise', 'core', 'bodyweight', true, ['lower abs', 'hip flexors']),
  S('Cable Crunch', 'core', 'cable', true, ['abs']),
  S('Russian Twist', 'core', 'bodyweight', true, ['obliques']),

  // Cardio
  S('Treadmill Run', 'cardio', 'machine', false, ['cardio']),
  S('Rowing Machine', 'cardio', 'machine', false, ['cardio', 'back', 'legs']),
  S('Jump Rope', 'cardio', 'bodyweight', false, ['cardio', 'calves']),

  // Full body
  S('Kettlebell Swing', 'fullbody', 'kettlebell', true, ['glutes', 'hamstrings', 'core']),
  S('Burpee', 'fullbody', 'bodyweight', true, ['full body']),
  S('Farmer\'s Walk', 'fullbody', 'dumbbell', false, ['grip', 'core', 'traps']),
];

/** Human-readable labels for each category, used in chips / pickers. */
export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
  fullbody: 'Full Body',
};

/** Human-readable labels for each equipment type. */
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  cable: 'Cable',
  band: 'Band',
  other: 'Other',
};
