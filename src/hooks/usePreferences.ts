/**
 * usePreferences — load and update user preferences.
 *
 * Returns the cached preferences synchronously (so the first render isn't
 * blank) and triggers an async load + state update in the background.
 */

import { useEffect, useState } from 'react';
import {
  getCachedPreferences,
  loadPreferences,
  updatePreferences,
} from '@/lib/preferences';
import type { UserPreferences } from '@/types';

export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => getCachedPreferences());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadPreferences()
      .then((p) => {
        if (mounted) {
          setPrefs(p);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      });
    return () => { mounted = false; };
  }, []);

  const update = async (patch: Partial<UserPreferences>) => {
    const next = await updatePreferences(patch);
    setPrefs(next);
    return next;
  };

  return { prefs, loaded, update };
}
