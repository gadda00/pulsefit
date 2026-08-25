/**
 * Tests for the preferences layer (AsyncStorage-backed).
 *
 * AsyncStorage is mocked in jest.setup.js with an in-memory map, so these
 * tests run synchronously and don't touch the real device storage.
 */

import {
  loadPreferences,
  getCachedPreferences,
  savePreferences,
  updatePreferences,
  clearPreferences,
  __resetCacheOnly,
} from '@/lib/preferences';
import { DEFAULT_PREFERENCES } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('preferences', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetCacheOnly();
  });

  it('returns defaults when nothing is stored', async () => {
    const prefs = await loadPreferences();
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists and reloads preferences', async () => {
    const updated = { ...DEFAULT_PREFERENCES, userName: 'Alex', preferredUnit: 'lb' as const };
    await savePreferences(updated);
    // Reset only the in-memory cache (simulates app restart, keeps AsyncStorage).
    __resetCacheOnly();
    const loaded = await loadPreferences();
    expect(loaded.userName).toBe('Alex');
    expect(loaded.preferredUnit).toBe('lb');
  });

  it('updates preferences with a partial patch', async () => {
    await savePreferences({ ...DEFAULT_PREFERENCES });
    __resetCacheOnly();
    const next = await updatePreferences({ userName: 'Sam', hapticsEnabled: false });
    expect(next.userName).toBe('Sam');
    expect(next.hapticsEnabled).toBe(false);
    expect(next.preferredUnit).toBe(DEFAULT_PREFERENCES.preferredUnit);
  });

  it('returns cached preferences synchronously after load', async () => {
    await savePreferences({ ...DEFAULT_PREFERENCES, userName: 'Cached' });
    const cached = getCachedPreferences();
    expect(cached.userName).toBe('Cached');
  });

  it('clears preferences', async () => {
    await savePreferences({ ...DEFAULT_PREFERENCES, userName: 'X' });
    await clearPreferences();
    const cached = getCachedPreferences();
    expect(cached).toEqual(DEFAULT_PREFERENCES);
  });
});
