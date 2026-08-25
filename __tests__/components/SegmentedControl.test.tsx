/**
 * Component tests for SegmentedControl.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

describe('<SegmentedControl />', () => {
  it('renders all options', () => {
    const { getByText } = render(
      <SegmentedControl
        value="a"
        onChange={() => {}}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
          { value: 'c', label: 'Gamma' },
        ]}
      />,
    );
    expect(getByText('Alpha')).toBeTruthy();
    expect(getByText('Beta')).toBeTruthy();
    expect(getByText('Gamma')).toBeTruthy();
  });

  it('calls onChange with the selected value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentedControl
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />,
    );
    fireEvent.press(getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
