/**
 * Component tests for SetRow.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SetRow } from '@/components/workout/SetRow';
import type { WorkoutSet } from '@/types';

const makeSet = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 1,
  workoutId: 1,
  exerciseId: 1,
  setIndex: 0,
  reps: 10,
  weight: 80,
  durationSec: null,
  isPR: false,
  completedAt: new Date().toISOString(),
  ...overrides,
});

describe('<SetRow />', () => {
  it('renders the set number (1-indexed)', () => {
    const { getByText } = render(<SetRow set={makeSet({ setIndex: 0 })} />);
    expect(getByText('1')).toBeTruthy();
  });

  it('renders the reps', () => {
    const { getByText } = render(<SetRow set={makeSet({ reps: 12 })} />);
    expect(getByText('12')).toBeTruthy();
  });

  it('renders the weight with unit', () => {
    const { getByText } = render(<SetRow set={makeSet({ weight: 82.5 })} unit="kg" />);
    expect(getByText('82.5 kg')).toBeTruthy();
  });

  it('renders duration for time-based exercises', () => {
    const { getByText } = render(<SetRow set={makeSet({ reps: null, weight: null, durationSec: 45 })} />);
    expect(getByText('00:45')).toBeTruthy();
  });

  it('shows PR badge when isPR is true', () => {
    const { getByText } = render(<SetRow set={makeSet({ isPR: true })} />);
    expect(getByText('PR')).toBeTruthy();
  });

  it('does not show PR badge when isPR is false', () => {
    const { queryByText } = render(<SetRow set={makeSet({ isPR: false })} />);
    expect(queryByText('PR')).toBeNull();
  });

  it('renders — for null reps', () => {
    const { getByText } = render(<SetRow set={makeSet({ reps: null })} />);
    // Multiple elements with text "—" may exist (reps and weight if both null)
    const elements = getByText('—');
    expect(elements).toBeTruthy();
  });

  it('calls onDelete when delete button pressed', () => {
    const onDelete = jest.fn();
    const { getByLabelText } = render(<SetRow set={makeSet()} onDelete={onDelete} />);
    fireEvent.press(getByLabelText('Delete set'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
