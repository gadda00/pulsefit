/**
 * Component tests for the Button UI primitive.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('<Button />', () => {
  it('renders the label', () => {
    const { getByText } = render(<Button label="Start Workout" onPress={() => {}} />);
    expect(getByText('Start Workout')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Tap Me" onPress={onPress} />);
    fireEvent.press(getByText('Tap Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Disabled" onPress={onPress} disabled />);
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    // When loading=true, the label is replaced by an ActivityIndicator, so
    // we look up the pressable by testID instead of by text.
    const { getByTestId } = render(<Button label="Loading" onPress={onPress} loading testID="loading-btn" />);
    fireEvent.press(getByTestId('loading-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies the testID', () => {
    const { getByTestId } = render(<Button label="X" onPress={() => {}} testID="my-btn" />);
    expect(getByTestId('my-btn')).toBeTruthy();
  });

  it('renders different variants without crashing', () => {
    expect(() => render(<Button label="Primary" variant="primary" onPress={() => {}} />)).not.toThrow();
    expect(() => render(<Button label="Secondary" variant="secondary" onPress={() => {}} />)).not.toThrow();
    expect(() => render(<Button label="Ghost" variant="ghost" onPress={() => {}} />)).not.toThrow();
    expect(() => render(<Button label="Danger" variant="danger" onPress={() => {}} />)).not.toThrow();
  });

  it('renders different sizes without crashing', () => {
    expect(() => render(<Button label="SM" size="sm" onPress={() => {}} />)).not.toThrow();
    expect(() => render(<Button label="MD" size="md" onPress={() => {}} />)).not.toThrow();
    expect(() => render(<Button label="LG" size="lg" onPress={() => {}} />)).not.toThrow();
  });
});
