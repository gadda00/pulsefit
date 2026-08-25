/**
 * VolumeChart — line chart of workout volume over time.
 *
 * Wraps `react-native-chart-kit`'s LineChart with PulseFit's dark theme.
 * The chart is responsive (uses Dimensions to pick a width) and gracefully
 * renders an empty state when there's no data.
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '@/constants/theme';
import type { VolumeByDay } from '@/types';
import { formatVolume } from '@/lib/utils';
import { Text } from '@/components/ui';

export interface VolumeChartProps {
  data: VolumeByDay[];
  unit?: 'kg' | 'lb';
  height?: number;
  testID?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function VolumeChart({ data, unit = 'kg', height = 220, testID }: VolumeChartProps) {
  if (data.length === 0 || data.every((d) => d.volume === 0)) {
    return (
      <View testID={testID} style={[styles.empty, { height }]}>
        <Text variant="body" muted center>No workouts logged yet.</Text>
      </View>
    );
  }

  const labels = data.map((d) => {
    // Show every Nth label to avoid clutter (7 labels max).
    const step = Math.ceil(data.length / 7);
    const idx = data.indexOf(d);
    return idx % step === 0 ? d.date.slice(5) : '';
  });

  const values = data.map((d) => Math.round(d.volume));

  return (
    <View testID={testID} style={styles.container}>
      <LineChart
        data={{
          labels,
          datasets: [{ data: values, color: () => Colors.primary, strokeWidth: 2 }],
        }}
        width={SCREEN_WIDTH - 48}
        height={height}
        yAxisSuffix=""
        yAxisLabel=""
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.5})`,
          fillShadowGradient: Colors.primary,
          fillShadowGradientOpacity: 0.2,
          propsForBackgroundLines: {
            stroke: Colors.divider,
            strokeDasharray: '4,4',
          },
          propsForDots: {
            r: '2',
            stroke: Colors.primary,
            fill: Colors.primary,
          },
        }}
        withInnerLines
        withOuterLines={false}
        withVerticalLabels
        withHorizontalLabels
        bezier
        style={styles.chart}
        formatYLabel={(y) => formatVolume(Number(y), unit)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  chart: {
    borderRadius: 12,
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});
