/**
 * Component tests for WorkoutCard.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import type { Workout } from '@/types';

const makeWorkout = (overrides: Partial<Workout> = {}): Workout => ({
  id: 1,
  name: 'Push Day',
  startedAt: new Date('2025-08-25T10:00:00Z').toISOString(),
  endedAt: new Date('2025-08-25T11:00:00Z').toISOString(),
  durationSec: 3600,
  totalVolume: 5000,
  totalSets: 12,
  notes: null,
  ...overrides,
});

describe('<WorkoutCard />', () => {
  it('renders the workout name', () => {
    const { getByText } = render(<WorkoutCard workout={makeWorkout()} />);
    expect(getByText('Push Day')).toBeTruthy();
  });

  it('renders the total volume', () => {
    const { getByText } = render(<WorkoutCard workout={makeWorkout()} />);
    expect(getByText(/5,000 kg/)).toBeTruthy();
  });

  it('renders the set count', () => {
    const { getByText } = render(<WorkoutCard workout={makeWorkout()} />);
    expect(getByText(/12 sets/)).toBeTruthy();
  });

  it('renders notes when present', () => {
    const { getByText } = render(<WorkoutCard workout={makeWorkout({ notes: 'Felt strong today' })} />);
    expect(getByText('Felt strong today')).toBeTruthy();
  });

  it('does not render notes section when notes is null', () => {
    const { queryByText } = render(<WorkoutCard workout={makeWorkout({ notes: null })} />);
    // No notes row should be rendered
    expect(queryByText('Felt strong today')).toBeNull();
  });

  it('uses the preferred unit', () => {
    const { getByText } = render(<WorkoutCard workout={makeWorkout({ totalVolume: 5000 })} unit="lb" />);
    expect(getByText(/5,000 lb/)).toBeTruthy();
  });

  it('truncates very long workout names', () => {
    const longName = 'A'.repeat(100);
    const { getByText } = render(<WorkoutCard workout={makeWorkout({ name: longName })} />);
    const el = getByText(longName);
    expect(el.props.numberOfLines).toBe(1);
  });
});
