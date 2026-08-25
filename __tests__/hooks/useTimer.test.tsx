/**
 * Tests for the useTimer hook.
 *
 * The hook uses setInterval, which Jest supports natively. We use Jest's fake
 * timers to control time progression deterministically.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { useTimer } from '@/hooks/useTimer';

function TimerHarness({ endsAt, onComplete }: { endsAt: number | null; onComplete?: () => void }) {
  const { remainingSec, isRunning, progress } = useTimer(endsAt, onComplete);
  return (
    <View>
      <Text testID="remaining">{remainingSec}</Text>
      <Text testID="running">{String(isRunning)}</Text>
      <Text testID="progress">{progress.toFixed(2)}</Text>
    </View>
  );
}

describe('useTimer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns zero state when endsAt is null', () => {
    const { getByTestId } = render(<TimerHarness endsAt={null} />);
    expect(getByTestId('remaining').props.children).toBe(0);
    expect(getByTestId('running').props.children).toBe('false');
    expect(getByTestId('progress').props.children).toBe('0.00');
  });

  it('counts down over time', () => {
    const now = Date.now();
    const ends = now + 10_000; // 10 seconds
    Date.now = jest.fn(() => now);

    const { getByTestId } = render(<TimerHarness endsAt={ends} />);

    // Initial tick: 10 seconds remaining
    expect(getByTestId('remaining').props.children).toBe(10);

    // Advance 3 seconds
    act(() => {
      Date.now = jest.fn(() => now + 3000);
      jest.advanceTimersByTime(3000);
    });

    expect(getByTestId('remaining').props.children).toBe(7);
    expect(getByTestId('running').props.children).toBe('true');
  });

  it('fires onComplete when timer reaches zero', () => {
    const now = Date.now();
    const ends = now + 5_000;
    Date.now = jest.fn(() => now);
    const onComplete = jest.fn();

    render(<TimerHarness endsAt={ends} onComplete={onComplete} />);

    act(() => {
      Date.now = jest.fn(() => now + 5000);
      jest.advanceTimersByTime(5000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('only fires onComplete once even if timer keeps ticking', () => {
    const now = Date.now();
    const ends = now + 5_000;
    Date.now = jest.fn(() => now);
    const onComplete = jest.fn();

    render(<TimerHarness endsAt={ends} onComplete={onComplete} />);

    act(() => {
      Date.now = jest.fn(() => now + 5000);
      jest.advanceTimersByTime(5000);
    });
    act(() => {
      Date.now = jest.fn(() => now + 10000);
      jest.advanceTimersByTime(5000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('computes progress between 0 and 1', () => {
    const now = Date.now();
    const ends = now + 10_000;
    Date.now = jest.fn(() => now);

    const { getByTestId } = render(<TimerHarness endsAt={ends} />);

    act(() => {
      Date.now = jest.fn(() => now + 5000);
      jest.advanceTimersByTime(5000);
    });

    const progress = parseFloat(getByTestId('progress').props.children);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });
});
