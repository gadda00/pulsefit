/**
 * Unit tests for src/lib/utils.ts
 *
 * These tests cover the formatting and arithmetic helpers that the rest of
 * the app depends on. They're pure functions so we don't need any DB or
 * React setup — just import and assert.
 */

import {
  toISODate,
  formatHumanDate,
  formatRelativeTime,
  formatDuration,
  formatWeight,
  formatVolume,
  formatRestTime,
  convertWeight,
  computeTotalVolume,
  computeWorkoutDuration,
  computeStreak,
  groupBy,
  sortBy,
  clamp,
  roundTo,
  isValidBarcode,
  truncate,
  percentage,
} from '@/lib/utils';
import type { Workout, WorkoutSet } from '@/types';

describe('toISODate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toISODate(new Date('2025-08-25T13:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('accepts ISO string input', () => {
    const iso = '2025-08-25T13:00:00Z';
    const fromStr = toISODate(iso);
    const fromDate = toISODate(new Date(iso));
    expect(fromStr).toBe(fromDate);
  });

  it('pads single-digit months and days', () => {
    const d = new Date(2025, 0, 5); // Jan 5, 2025 local time
    expect(toISODate(d)).toBe('2025-01-05');
  });
});

describe('formatHumanDate', () => {
  it('returns a short readable date string', () => {
    const s = formatHumanDate(new Date(2025, 7, 25));
    expect(s).toContain('25');
    expect(s).toContain('Aug');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for recent times', () => {
    expect(formatRelativeTime(new Date())).toBe('just now');
  });

  it('returns "Xm ago" for minutes', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(d)).toBe('5m ago');
  });

  it('returns "Xh ago" for hours', () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(d)).toBe('3h ago');
  });

  it('returns "Xd ago" for days', () => {
    const d = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(d)).toBe('2d ago');
  });
});

describe('formatDuration', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatDuration(75)).toBe('01:15');
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(9)).toBe('00:09');
  });

  it('formats hours as HH:MM:SS', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('handles invalid input', () => {
    expect(formatDuration(-1)).toBe('00:00');
    expect(formatDuration(NaN)).toBe('00:00');
    expect(formatDuration(Infinity)).toBe('00:00');
  });
});

describe('formatWeight', () => {
  it('formats a number with unit', () => {
    expect(formatWeight(82.5, 'kg')).toBe('82.5 kg');
    expect(formatWeight(180, 'lb')).toBe('180 lb');
  });

  it('trims trailing .0', () => {
    expect(formatWeight(80, 'kg')).toBe('80 kg');
  });

  it('rounds to 1 decimal', () => {
    expect(formatWeight(82.456, 'kg')).toBe('82.5 kg');
  });

  it('handles null', () => {
    expect(formatWeight(null, 'kg')).toBe('— kg');
  });
});

describe('formatVolume', () => {
  it('formats zero', () => {
    expect(formatVolume(0, 'kg')).toBe('0 kg');
  });

  it('adds thousands separator for large numbers', () => {
    expect(formatVolume(12345, 'kg')).toBe('12,345 kg');
  });

  it('keeps 1 decimal for non-integer volumes', () => {
    expect(formatVolume(1234.5, 'kg')).toBe('1,234.5 kg');
  });
});

describe('formatRestTime', () => {
  it('formats seconds-only rest times', () => {
    expect(formatRestTime(0)).toBe('0s');
    expect(formatRestTime(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatRestTime(60)).toBe('1m');
    expect(formatRestTime(90)).toBe('1m 30s');
    expect(formatRestTime(120)).toBe('2m');
  });
});

describe('convertWeight', () => {
  it('returns the same value when units match', () => {
    expect(convertWeight(80, 'kg', 'kg')).toBe(80);
  });

  it('converts kg to lb', () => {
    expect(convertWeight(80, 'kg', 'lb')).toBeCloseTo(176.37, 1);
  });

  it('converts lb to kg', () => {
    expect(convertWeight(176.37, 'lb', 'kg')).toBeCloseTo(80, 1);
  });
});

describe('computeTotalVolume', () => {
  const makeSet = (reps: number | null, weight: number | null): WorkoutSet => ({
    id: 1, workoutId: 1, exerciseId: 1, setIndex: 0,
    reps, weight, durationSec: null, isPR: false, completedAt: new Date().toISOString(),
  });

  it('sums reps × weight across sets', () => {
    const sets = [makeSet(10, 80), makeSet(8, 90), makeSet(5, 100)];
    expect(computeTotalVolume(sets)).toBe(10 * 80 + 8 * 90 + 5 * 100);
  });

  it('skips sets with null reps or weight', () => {
    const sets = [makeSet(10, 80), makeSet(null, 90), makeSet(5, null)];
    expect(computeTotalVolume(sets)).toBe(800);
  });

  it('returns 0 for empty array', () => {
    expect(computeTotalVolume([])).toBe(0);
  });
});

describe('computeWorkoutDuration', () => {
  const makeWorkout = (startedAt: string, endedAt: string | null): Workout => ({
    id: 1, name: 'Test', startedAt, endedAt,
    durationSec: 0, totalVolume: 0, totalSets: 0, notes: null,
  });

  it('computes duration for completed workout', () => {
    const start = '2025-08-25T10:00:00Z';
    const end = '2025-08-25T10:45:00Z';
    expect(computeWorkoutDuration(makeWorkout(start, end))).toBe(45 * 60);
  });

  it('uses "now" for in-progress workout', () => {
    const start = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const duration = computeWorkoutDuration(makeWorkout(start, null));
    expect(duration).toBeGreaterThanOrEqual(29 * 60);
    expect(duration).toBeLessThanOrEqual(31 * 60);
  });

  it('returns 0 for negative duration (clock skew)', () => {
    const start = '2025-08-25T10:00:00Z';
    const end = '2025-08-25T09:00:00Z';
    expect(computeWorkoutDuration(makeWorkout(start, end))).toBe(0);
  });
});

describe('computeStreak', () => {
  it('returns 0 for empty array', () => {
    expect(computeStreak([], new Date('2025-08-25'))).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const today = new Date('2025-08-25');
    expect(computeStreak(['2025-08-25', '2025-08-24', '2025-08-23'], today)).toBe(3);
  });

  it('counts streak if yesterday was last workout', () => {
    const today = new Date('2025-08-25');
    expect(computeStreak(['2025-08-24', '2025-08-23'], today)).toBe(2);
  });

  it('returns 0 if gap is more than 1 day', () => {
    const today = new Date('2025-08-25');
    expect(computeStreak(['2025-08-22'], today)).toBe(0);
  });

  it('handles non-consecutive entries', () => {
    const today = new Date('2025-08-25');
    expect(computeStreak(['2025-08-25', '2025-08-23'], today)).toBe(1);
  });

  it('handles long streaks', () => {
    const today = new Date('2025-08-25');
    const dates: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(toISODate(d));
    }
    expect(computeStreak(dates, today)).toBe(30);
  });
});

describe('groupBy', () => {
  it('groups items by key', () => {
    const items = [
      { id: 1, cat: 'a' },
      { id: 2, cat: 'b' },
      { id: 3, cat: 'a' },
    ];
    const grouped = groupBy(items, (i) => i.cat);
    expect(grouped.get('a')?.length).toBe(2);
    expect(grouped.get('b')?.length).toBe(1);
  });

  it('preserves insertion order', () => {
    const items = [
      { id: 1, cat: 'c' },
      { id: 2, cat: 'a' },
      { id: 3, cat: 'b' },
    ];
    const grouped = groupBy(items, (i) => i.cat);
    expect(Array.from(grouped.keys())).toEqual(['c', 'a', 'b']);
  });
});

describe('sortBy', () => {
  it('sorts numbers ascending', () => {
    expect(sortBy([3, 1, 2], (n) => n)).toEqual([1, 2, 3]);
  });

  it('sorts numbers descending', () => {
    expect(sortBy([1, 3, 2], (n) => n, false)).toEqual([3, 2, 1]);
  });

  it('sorts strings', () => {
    expect(sortBy(['banana', 'apple', 'cherry'], (s) => s)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('does not mutate the original array', () => {
    const orig = [3, 1, 2];
    sortBy(orig, (n) => n);
    expect(orig).toEqual([3, 1, 2]);
  });
});

describe('clamp', () => {
  it('clamps below minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps above maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('preserves in-range values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('roundTo', () => {
  it('rounds to 1 decimal by default', () => {
    expect(roundTo(3.14159)).toBe(3.1);
  });

  it('rounds to specified decimals', () => {
    expect(roundTo(3.14159, 3)).toBe(3.142);
  });
});

describe('isValidBarcode', () => {
  it('accepts 8-14 digit strings', () => {
    expect(isValidBarcode('12345678')).toBe(true);
    expect(isValidBarcode('12345678901234')).toBe(true);
    expect(isValidBarcode('123456789012')).toBe(true);
  });

  it('rejects too short / too long', () => {
    expect(isValidBarcode('1234567')).toBe(false);
    expect(isValidBarcode('123456789012345')).toBe(false);
  });

  it('rejects non-numeric', () => {
    expect(isValidBarcode('1234567a')).toBe(false);
    expect(isValidBarcode('')).toBe(false);
  });
});

describe('truncate', () => {
  it('returns original if shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });

  it('handles edge cases', () => {
    expect(truncate('hello', 5)).toBe('hello');
    expect(truncate('hello', 1)).toBe('…');
  });
});

describe('percentage', () => {
  it('computes a rounded percentage', () => {
    expect(percentage(25, 100)).toBe(25);
    expect(percentage(33.333, 100)).toBe(33.3);
  });

  it('returns 0 for zero total', () => {
    expect(percentage(10, 0)).toBe(0);
  });
});
