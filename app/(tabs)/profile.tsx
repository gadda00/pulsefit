/**
 * Profile tab — settings, body-weight log, and about.
 *
 * Sections:
 *  1. User identity (name + preferred unit). Editing the name instantly
 *     updates the Home screen greeting.
 *  2. Body-weight log — table of recent entries + a button to log a new one.
 *  3. App preferences — haptics toggle, default rest duration.
 *  4. About + danger zone (reset all data).
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { usePreferences } from '@/hooks/usePreferences';
import {
  logBodyWeight,
  getBodyWeightEntries,
  getLatestBodyWeight,
  deleteBodyWeightEntry,
} from '@/lib/db';
import { formatHumanDate, formatWeight } from '@/lib/utils';
import { Card, Text, TextInput, Button, SegmentedControl, EmptyState } from '@/components/ui';
import type { BodyWeightEntry, WeightUnit } from '@/types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { prefs, update } = usePreferences();

  const [name, setName] = useState(prefs.userName);
  const [refresh, setRefresh] = useState(0);
  const [newWeight, setNewWeight] = useState('');
  const [weightNote, setWeightNote] = useState('');

  const entries = useMemo<BodyWeightEntry[]>(() => getBodyWeightEntries(20), [refresh]);
  const latest = useMemo(() => getLatestBodyWeight(), [refresh]);

  const saveName = () => {
    if (name !== prefs.userName) update({ userName: name });
  };

  const handleLogWeight = () => {
    const w = parseFloat(newWeight);
    if (!w || w <= 0 || w > 1000) {
      Alert.alert('Invalid weight', 'Please enter a number between 1 and 1000.');
      return;
    }
    logBodyWeight(w, prefs.preferredUnit, weightNote.trim() || undefined);
    setNewWeight('');
    setWeightNote('');
    setRefresh((r) => r + 1);
  };

  const handleDeleteWeight = (id: number) => {
    Alert.alert('Delete entry', 'Remove this body-weight entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteBodyWeightEntry(id);
          setRefresh((r) => r + 1);
        },
      },
    ]);
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset all data',
      'This will permanently delete all workouts, sets, body-weight entries, and scanned products. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Drop and re-create all tables via the migration function.
            const { getDb } = require('@/lib/db');
            const db = getDb();
            db.execSync(`
              DROP TABLE IF EXISTS workout_sets;
              DROP TABLE IF EXISTS workouts;
              DROP TABLE IF EXISTS body_weight;
              DROP TABLE IF EXISTS scanned_products;
              DELETE FROM exercises WHERE is_custom = 1;
            `);
            setRefresh((r) => r + 1);
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100 }}
    >
      <Text variant="h1">Profile</Text>

      {/* Identity */}
      <Card padding="lg" style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>Your Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alex"
          onBlur={saveName}
          returnKeyType="done"
          testID="profile-name-input"
        />
        <Text variant="h3" style={styles.sectionTitle}>Preferred Unit</Text>
        <SegmentedControl<WeightUnit>
          value={prefs.preferredUnit}
          onChange={(v) => update({ preferredUnit: v })}
          options={[
            { value: 'kg', label: 'Kilograms' },
            { value: 'lb', label: 'Pounds' },
          ]}
          testID="unit-selector"
        />
      </Card>

      {/* Body weight */}
      <Card padding="lg" style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text variant="h3">Body Weight</Text>
          {latest ? (
            <Text variant="body" accent semibold>
              {formatWeight(latest.weight, latest.unit)}
            </Text>
          ) : null}
        </View>
        <View style={styles.logRow}>
          <TextInput
            value={newWeight}
            onChangeText={setNewWeight}
            placeholder="Weight"
            prefix={prefs.preferredUnit}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1, marginBottom: 0 }}
            testID="weight-input"
          />
          <Button label="Log" onPress={handleLogWeight} size="md" style={{ marginLeft: Spacing.sm }} testID="log-weight-btn" />
        </View>
        <TextInput
          value={weightNote}
          onChangeText={setWeightNote}
          placeholder="Optional note (e.g. 'after morning run')"
          testID="weight-note-input"
        />

        {entries.length === 0 ? (
          <Text variant="body" muted center style={{ marginTop: Spacing.md }}>
            No weight entries yet.
          </Text>
        ) : (
          <View style={styles.entriesList}>
            {entries.slice(0, 8).map((e) => (
              <Pressable
                key={e.id}
                onLongPress={() => handleDeleteWeight(e.id)}
                style={({ pressed }) => [styles.entryRow, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body" semibold>{formatWeight(e.weight, e.unit)}</Text>
                  <Text variant="caption" muted>{formatHumanDate(e.measuredAt)}</Text>
                </View>
                {e.note ? <Text variant="caption" muted style={styles.entryNote}>{e.note}</Text> : null}
              </Pressable>
            ))}
            <Text variant="caption" muted center style={{ marginTop: Spacing.sm }}>
              Long-press an entry to delete it.
            </Text>
          </View>
        )}
      </Card>

      {/* Preferences */}
      <Card padding="lg" style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.prefRow}>
          <View>
            <Text variant="body">Haptic feedback</Text>
            <Text variant="caption" muted>On set logs and timer end</Text>
          </View>
          <Switch
            value={prefs.hapticsEnabled}
            onValueChange={(v) => { void update({ hapticsEnabled: v }); }}
            trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
          />
        </View>
        <View style={styles.prefRow}>
          <View>
            <Text variant="body">Default rest timer</Text>
            <Text variant="caption" muted>Seconds between sets</Text>
          </View>
          <SegmentedControl
            value={String(prefs.defaultRestSec)}
            onChange={(v) => update({ defaultRestSec: parseInt(v, 10) })}
            options={[
              { value: '60', label: '60s' },
              { value: '90', label: '90s' },
              { value: '120', label: '120s' },
              { value: '180', label: '180s' },
            ]}
            testID="rest-selector"
          />
        </View>
      </Card>

      {/* About */}
      <Card padding="lg" style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutRow}>
          <Ionicons name="barbell-outline" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="body" semibold>PulseFit</Text>
            <Text variant="caption" muted>Version 1.0.0</Text>
          </View>
        </View>
        <Text variant="caption" muted style={{ marginTop: Spacing.md }}>
          A modern fitness tracker built with React Native + Expo. Tracks workouts, scans barcodes for nutrition data, and visualises your progress over time.
        </Text>
      </Card>

      {/* Danger zone */}
      <Card padding="lg" style={[styles.section, styles.dangerZone]}>
        <Text variant="h3" style={styles.dangerTitle}>Reset All Data</Text>
        <Text variant="caption" muted style={{ marginBottom: Spacing.md }}>
          Permanently deletes all workouts, sets, weight entries, and scans. Cannot be undone.
        </Text>
        <Button label="Reset App Data" variant="danger" onPress={handleResetApp} testID="reset-btn" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  entriesList: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  entryNote: {
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.sm,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dangerZone: {
    borderColor: Colors.danger,
    borderWidth: 1,
  },
  dangerTitle: {
    color: Colors.danger,
    marginBottom: Spacing.xs,
  },
});
