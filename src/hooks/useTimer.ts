/**
 * useTimer — a precise countdown hook based on a target end time.
 *
 * Implementation notes:
 *  - We store the rest-timer's *end* timestamp (not remaining seconds) in the
 *    Zustand store. This is the standard pattern for resilient countdowns:
 *    even if the JS thread is paused (background tab, slow GC), the displayed
 *    value snaps back to the correct remaining seconds on the next tick.
 *  - The hook uses setInterval(1000) — the displayed value updates once per
 *    second, which is smooth enough for a 90s rest timer without burning CPU.
 *  - The hook fires `onComplete` exactly once when the timer hits zero, even
 *    if the component re-renders multiple times during the same tick.
 */

import { useEffect, useRef, useState } from 'react';

export interface UseTimerResult {
  remainingSec: number;
  isRunning: boolean;
  progress: number; // 0..1 (1 = full duration remaining, 0 = expired)
}

export function useTimer(endsAt: number | null, onComplete?: () => void): UseTimerResult {
  const [now, setNow] = useState(() => Date.now());
  const completedRef = useRef(false);
  const totalRef = useRef<number>(0);

  // Capture the total duration the first time we see a valid endsAt, so we
  // can compute progress (0..1) for visual fill animations.
  useEffect(() => {
    if (endsAt) {
      const total = Math.max(1, Math.ceil((endsAt - Date.now()) / 1000));
      totalRef.current = total;
      completedRef.current = false;
    }
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt) {
      completedRef.current = false;
      return;
    }

    const tick = () => {
      const t = Date.now();
      setNow(t);
      const remaining = Math.max(0, Math.ceil((endsAt - t) / 1000));
      if (remaining === 0 && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };

    tick(); // run once immediately so the UI doesn't flash the full duration
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, onComplete]);

  if (!endsAt) return { remainingSec: 0, isRunning: false, progress: 0 };

  const remainingSec = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const isRunning = remainingSec > 0;
  const progress = totalRef.current > 0 ? remainingSec / totalRef.current : 0;
  return { remainingSec, isRunning, progress };
}
