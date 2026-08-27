/**
 * User preferences — persisted in AsyncStorage as a single JSON blob.
 *
 * Stored separately from the SQLite database because the prefs object is
 * small, read on every app launch, and rarely written. A JSON blob in
 * AsyncStorage is simpler to evolve than a SQLite table for this shape.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/types';

const KEY = '@pulsefit/preferences';

let cached: UserPreferences | null = null;

/** Load preferences from AsyncStorage. Falls back to defaults on any error. */
export async function loadPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    cached = { ...DEFAULT_PREFERENCES, ...parsed };
    return cached;
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/** Synchronously return the cached preferences, or defaults if not yet loaded. */
export function getCachedPreferences(): UserPreferences {
  return cached ?? { ...DEFAULT_PREFERENCES };
}

/** Persist preferences and update the in-memory cache. */
export async function savePreferences(prefs: UserPreferences): Promise<void> {
  cached = prefs;
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}

/** Update a subset of preferences (shallow merge) and persist. */
export async function updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const next = { ...getCachedPreferences(), ...patch };
  await savePreferences(next);
  return next;
}

/** Clear stored preferences (used by the "reset app" button in Profile). */
export async function clearPreferences(): Promise<void> {
  cached = null;
  await AsyncStorage.removeItem(KEY);
}

/** Test-only helper: reset the in-memory cache WITHOUT touching AsyncStorage.
 *  Simulates an app restart so tests can verify preferences persist across
 *  restarts. */
export function __resetCacheOnly(): void {
  cached = null;
}
