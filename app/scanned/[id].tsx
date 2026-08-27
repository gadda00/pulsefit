/**
 * Scanned product detail screen.
 *
 * Shows the full nutrition breakdown for a scanned product, lets the user
 * add / edit notes, and (if the OFF lookup was incomplete) re-fetches fresh
 * data via the API.
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { getScannedProducts, deleteScannedProduct, upsertScannedProduct } from '@/lib/db';
import { lookupBarcode } from '@/lib/openfoodfacts';
import { formatRelativeTime } from '@/lib/utils';
import { Card, Text, Button, TextInput, EmptyState } from '@/components/ui';
import type { ScannedProduct } from '@/types';

function findProduct(id: number): ScannedProduct | null {
  const all = getScannedProducts(1000);
  return all.find((p) => p.id === id) ?? null;
}

export default function ScannedProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [refresh, setRefresh] = useState(0);
  const product = useMemo<ScannedProduct | null>(() => findProduct(productId), [productId, refresh]);
  const [notes, setNotes] = useState(product?.notes ?? '');
  const [refreshing, setRefreshing] = useState(false);

  if (!product) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState emoji="❓" title="Product not found" />
      </View>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await lookupBarcode(product.barcode);
      if (result.found && result.product) {
        upsertScannedProduct({ ...result.product, notes: product.notes });
        setRefresh((r) => r + 1);
        Alert.alert('Updated', 'Refreshed nutrition data from Open Food Facts.');
      } else {
        Alert.alert('Not found', result.error ?? 'Open Food Facts has no data for this barcode.');
      }
    } catch (e: any) {
      Alert.alert('Refresh failed', e?.message ?? 'Please try again later.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveNotes = () => {
    upsertScannedProduct({
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      caloriesPer100g: product.caloriesPer100g,
      proteinPer100g: product.proteinPer100g,
      carbsPer100g: product.carbsPer100g,
      fatPer100g: product.fatPer100g,
      servingSize: product.servingSize,
      servingUnit: product.servingUnit,
      nutriscore: product.nutriscore,
      notes,
    });
    setRefresh((r) => r + 1);
    Alert.alert('Saved', 'Notes updated.');
  };

  const handleDelete = () => {
    Alert.alert('Delete product', 'Remove this scan from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteScannedProduct(productId);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 40 }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={26} color={Colors.text} />
        </Pressable>
        <Text variant="h2" style={{ flex: 1, marginLeft: Spacing.md }} numberOfLines={1}>Product</Text>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color={Colors.danger} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* Hero */}
        <Card padding="lg">
          <View style={styles.heroRow}>
            <View style={styles.imageWrap}>
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Ionicons name="cube-outline" size={32} color={Colors.textMuted} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3" numberOfLines={3}>{product.name}</Text>
              {product.brand ? <Text variant="body" muted>{product.brand}</Text> : null}
              <Text variant="caption" muted>Barcode: {product.barcode}</Text>
              <Text variant="caption" muted>Scanned {formatRelativeTime(product.scannedAt)}</Text>
            </View>
          </View>
          {product.nutriscore ? (
            <View style={styles.nutriscoreRow}>
              <Text variant="body">Nutri-Score:</Text>
              <View style={[styles.nutriscoreBadge, { backgroundColor: nutriscoreColor(product.nutriscore) }]}>
                <Text variant="h3" style={styles.nutriscoreText}>{product.nutriscore.toUpperCase()}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Nutrition */}
        <Card padding="lg" style={{ marginTop: Spacing.md }}>
          <Text variant="h3" style={{ marginBottom: Spacing.md }}>Nutrition (per 100g)</Text>
          <NutritionRow label="Calories" value={product.caloriesPer100g} suffix="kcal" />
          <NutritionRow label="Protein" value={product.proteinPer100g} suffix="g" accent />
          <NutritionRow label="Carbs" value={product.carbsPer100g} suffix="g" />
          <NutritionRow label="Fat" value={product.fatPer100g} suffix="g" />
          {product.servingSize ? (
            <View style={styles.servingRow}>
              <Text variant="caption" muted>
                Serving size: {product.servingSize}{product.servingUnit ? ` ${product.servingUnit}` : ''}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Notes */}
        <Card padding="lg" style={{ marginTop: Spacing.md }}>
          <Text variant="h3" style={{ marginBottom: Spacing.sm }}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. 'great pre-workout, 30g before training'"
            multiline
            style={{ height: 80, textAlignVertical: 'top' }}
            testID="product-notes-input"
          />
          <Button label="Save Notes" onPress={handleSaveNotes} variant="secondary" size="md" style={{ marginTop: Spacing.sm }} />
        </Card>

        {/* Actions */}
        <Button
          label={refreshing ? 'Refreshing...' : 'Refresh from Open Food Facts'}
          onPress={handleRefresh}
          variant="ghost"
          size="md"
          disabled={refreshing}
          icon={<Ionicons name="refresh" size={18} color={Colors.text} />}
          style={{ marginTop: Spacing.md }}
        />
      </View>
    </ScrollView>
  );
}

function NutritionRow({ label, value, suffix, accent }: { label: string; value: number | null; suffix: string; accent?: boolean }) {
  return (
    <View style={styles.nutritionRow}>
      <Text variant="body" muted>{label}</Text>
      <Text variant="body" semibold accent={accent}>
        {value != null ? `${value} ${suffix}` : '—'}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  body: { paddingHorizontal: Spacing.lg },
  heroRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  imageWrap: {
    width: 80,
    height: 80,
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
  nutriscoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  nutriscoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriscoreText: {
    color: '#0A0A0A',
    fontWeight: '800',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  servingRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
