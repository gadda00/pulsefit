/**
 * ProductCard — list item for a scanned food / supplement product.
 *
 * Shows: image (if available), name, brand, calorie + macro breakdown.
 * Tappable to expand and add notes.
 */

import React from 'react';
import { Pressable, View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { ScannedProduct } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { Card, Text } from '@/components/ui';

export interface ProductCardProps {
  product: ScannedProduct;
  onPress?: () => void;
  testID?: string;
}

export function ProductCard({ product, onPress, testID }: ProductCardProps) {
  const inner = (
    <Card padding="md" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.imageWrap}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="cube-outline" size={24} color={Colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text variant="body" semibold numberOfLines={2}>{product.name}</Text>
          {product.brand ? (
            <Text variant="caption" muted numberOfLines={1}>{product.brand}</Text>
          ) : null}
          <View style={styles.macrosRow}>
            <MacroPill label="kcal" value={product.caloriesPer100g} />
            <MacroPill label="P" value={product.proteinPer100g} suffix="g" />
            <MacroPill label="C" value={product.carbsPer100g} suffix="g" />
            <MacroPill label="F" value={product.fatPer100g} suffix="g" />
          </View>
        </View>
        {product.nutriscore ? (
          <View style={[styles.nutriscore, { backgroundColor: nutriscoreColor(product.nutriscore) }]}>
            <Text variant="label" style={styles.nutriscoreText}>
              {product.nutriscore.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" muted style={styles.scannedAt}>
        Scanned {formatRelativeTime(product.scannedAt)}
      </Text>
    </Card>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={onPress}
      style={({ pressed }) => pressed ? { opacity: 0.85 } : null}
    >
      {inner}
    </Pressable>
  );
}

function MacroPill({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <View style={styles.macroPill}>
      <Text variant="label" muted style={styles.macroLabel}>{label}</Text>
      <Text variant="caption" semibold>
        {value != null ? `${value}${suffix ?? ''}` : '—'}
      </Text>
    </View>
  );
}

function nutriscoreColor(grade: string): string {
  switch (grade.toLowerCase()) {
    case 'a': return '#00E676';
    case 'b': return '#9CCC65';
    case 'c': return '#FFB300';
    case 'd': return '#FF7043';
    case 'e': return '#FF5252';
    default: return Colors.textMuted;
  }
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  imageWrap: {
    width: 60,
    height: 60,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radii.md,
  },
  imagePlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  macroPill: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 9,
  },
  nutriscore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriscoreText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '800',
  },
  scannedAt: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
