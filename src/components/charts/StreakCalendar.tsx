/**
 * StreakCalendar — visual representation of the current streak.
 *
 * A 7-day strip (Mon-Sun) where each day is a circle: filled green if a
 * workout was completed, hollow if not. The current day has a ring around it.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { toISODate } from '@/lib/utils';
import { Text } from '@/components/ui';

export interface StreakCalendarProps {
  /** ISO dates with at least one workout. */
  workoutDates: string[];
  today?: Date;
  testID?: string;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakCalendar({ workoutDates, today = new Date(), testID }: StreakCalendarProps) {
  const set = new Set(workoutDates);

  // Build a 7-day window starting from the Monday of the current week.
  const start = new Date(today);
  const dayOfWeek = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - dayOfWeek);

  const days: { date: Date; iso: string; isToday: boolean; didWorkout: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISODate(d);
    days.push({
      date: d,
      iso,
      isToday: iso === toISODate(today),
      didWorkout: set.has(iso),
    });
  }

  return (
    <View testID={testID} style={styles.container}>
      {days.map((d, i) => (
        <View key={i} style={styles.day}>
          <Text variant="caption" muted style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
          <View style={[
            styles.circle,
            d.didWorkout && styles.circleFilled,
            d.isToday && styles.circleToday,
          ]}>
            <Text
              variant="caption"
              style={{ color: d.didWorkout ? '#0A0A0A' : Colors.textSecondary, fontWeight: '600' }}
            >
              {d.date.getDate()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dayLabel: {
    fontSize: 10,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  circleToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
});
