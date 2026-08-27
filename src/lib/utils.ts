/**
 * Pure utility functions for PulseFit.
 *
 * Every function in this file is pure (no I/O, no side effects) which makes
 * them trivial to unit test. Components and hooks should reach for these
 * helpers instead of re-implementing formatting / arithmetic inline.
 */

import type { Workout, WorkoutSet, WeightUnit } from '@/types';

/** Format a Date as an ISO date string (YYYY-MM-DD) in the local timezone. */
export function toISODate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a Date as a human-readable date (e.g. "Mon, 12 Aug"). */
export function formatHumanDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

/** Format a Date as a relative "time ago" string (e.g. "2h ago", "just now"). */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Format a duration in seconds as "MM:SS" or "HH:MM:SS" if over an hour. */
export function formatDuration(totalSec: number): string {
  if (totalSec < 0 || !Number.isFinite(totalSec)) return '00:00';
  const sec = Math.floor(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format a weight value with the given unit (e.g. "82.5 kg", "180 lb"). */
export function formatWeight(weight: number | null | undefined, unit: WeightUnit = 'kg'): string {
  if (weight == null || Number.isNaN(weight)) return `— ${unit}`;
  const rounded = Math.round(weight * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
}

/** Format a volume number (sum of reps × weight) with thousands separators. */
export function formatVolume(volume: number | null | undefined, unit: WeightUnit = 'kg'): string {
  if (volume == null || Number.isNaN(volume) || volume === 0) return `0 ${unit}`;
  const rounded = Math.round(volume * 10) / 10;
  const str = rounded >= 1000
    ? rounded.toLocaleString('en-US', { maximumFractionDigits: 1 })
    : rounded.toFixed(rounded % 1 === 0 ? 0 : 1);
  return `${str} ${unit}`;
}

/** Format a number of seconds as "Xm Ys" or "Xs" for rest-timer labels. */
export function formatRestTime(sec: number): string {
  if (sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Convert a weight between kg and lb.
 * Uses the standard 1 kg = 2.20462262 lb conversion factor.
 */
export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  if (from === 'kg' && to === 'lb') return weight * 2.20462262;
  return weight / 2.20462262; // lb -> kg
}

/**
 * Compute total volume for a list of sets.
 * Volume = sum of (reps × weight) for sets where both are present.
 * Sets with null reps or weight contribute 0.
 */
export function computeTotalVolume(sets: WorkoutSet[]): number {
  return sets.reduce((acc, s) => {
    if (s.reps == null || s.weight == null) return acc;
    return acc + s.reps * s.weight;
  }, 0);
}

/**
 * Compute the duration of a workout in seconds.
 * If the workout hasn't ended yet, uses the current time as the end.
 */
export function computeWorkoutDuration(workout: Workout, now: Date = new Date()): number {
  const start = new Date(workout.startedAt).getTime();
  const end = workout.endedAt ? new Date(workout.endedAt).getTime() : now.getTime();
  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * Compute the current streak: number of consecutive days (ending today or
 * yesterday) on which at least one workout was completed.
 *
 * @param workoutDates ISO date strings ("YYYY-MM-DD") of completed workouts.
 * @param today Override for deterministic tests.
 */
export function computeStreak(workoutDates: string[], today: Date = new Date()): number {
  if (workoutDates.length === 0) return 0;
  const set = new Set(workoutDates);
  let streak = 0;
  const cursor = new Date(toISODate(today));

  // Allow the streak to be "alive" if the last workout was today OR yesterday.
  if (!set.has(toISODate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(toISODate(cursor))) return 0;
  }

  // Walk backwards while each prior day is in the set.
  while (set.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Group an array by a key function. Returns a Map preserving insertion order.
 * Useful for grouping sets by exercise or workouts by day.
 */
export function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** Sort an array in place by a key function (ascending by default). */
export function sortBy<T>(arr: T[], keyFn: (item: T) => string | number, asc = true): T[] {
  const sign = asc ? 1 : -1;
  return [...arr].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    if (typeof ka === 'string' && typeof kb === 'string') {
      return sign * ka.localeCompare(kb);
    }
    return sign * ((ka as number) - (kb as number));
  });
}

/** Clamp a number to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Round to a fixed number of decimals, returning a number (not a string). */
export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Generate a reasonably-unique id without external deps (used for client-only rows). */
export function generateLocalId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns true if the given string is a plausible barcode (8-14 digits). */
export function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

/** Truncate a string to maxLen, appending an ellipsis if cut. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, Math.max(0, maxLen - 1)).trimEnd() + '…';
}

/** Compute the percentage of a part relative to a total, rounded to 1 decimal. */
export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return roundTo((part / total) * 100, 1);
}

/** Sleep for `ms` milliseconds. Useful in tests and async flows. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
