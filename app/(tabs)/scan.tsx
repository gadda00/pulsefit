/**
 * Scan tab — barcode scanner for supplements and food.
 *
 * The user grants camera permission (handled by `expo-camera`'s
 * `useCameraPermissions` hook). When permission is granted we render a live
 * camera preview with a green scanning reticle in the middle. When the camera
 * detects a barcode, we:
 *  1. Look up the barcode against the Open Food Facts API.
 *  2. Cache the result in SQLite via `upsertScannedProduct`.
 *  3. Navigate to the product detail screen.
 *
 * If the same barcode is scanned twice, the second scan updates the cached
 * row (e.g. refreshes the nutrition data) instead of creating a duplicate.
 *
 * The screen also lists recently-scanned products at the bottom so the user
 * can quickly re-open a previous scan without rescanning.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, Shadows, Typography } from '@/constants/theme';
import { lookupBarcode } from '@/lib/openfoodfacts';
import { upsertScannedProduct, getScannedProducts } from '@/lib/db';
import type { ScannedProduct } from '@/types';
import { Card, Text, Button, EmptyState } from '@/components/ui';
import { ProductCard } from '@/components/scan/ProductCard';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<ScannedProduct[]>([]);

  const refreshRecent = useCallback(() => {
    try { setRecent(getScannedProducts(20)); } catch { /* ignore */ }
  }, []);

  useEffect(() => { refreshRecent(); }, [refreshRecent]);

  const handleBarcodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* ignore */ }

    try {
      const result = await lookupBarcode(data);
      if (!result.found || !result.product) {
        // Cache the scan even if OFF didn't find it, so the user has a record.
        const product = upsertScannedProduct({
          barcode: data,
          name: `Unknown product (${data})`,
          brand: null,
          imageUrl: null,
          caloriesPer100g: null,
          proteinPer100g: null,
          carbsPer100g: null,
          fatPer100g: null,
          servingSize: null,
          servingUnit: null,
          nutriscore: null,
          notes: result.error ?? 'Product not found in Open Food Facts',
        });
        refreshRecent();
        Alert.alert(
          'Product not found',
          `We couldn't find barcode ${data} in the Open Food Facts database. You can still add notes manually.`,
          [
            { text: 'OK', onPress: () => router.push(`/scanned/${product.id}`) },
          ],
        );
      } else {
        const product = upsertScannedProduct(result.product);
        refreshRecent();
        router.push(`/scanned/${product.id}`);
      }
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Please try again');
    } finally {
      setLoading(false);
      // Re-arm scanning after a short cooldown to avoid immediate re-scan.
      setTimeout(() => setScanning(true), 1500);
    }
  }, [scanning, loading, router, refreshRecent]);

  // Permission gate
  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text variant="h1">Scan</Text>
        <EmptyState emoji="📷" title="Loading camera..." subtitle="Checking permissions" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100, paddingHorizontal: Spacing.lg }}
      >
        <Text variant="h1">Scan</Text>
        <Text variant="body" muted style={{ marginTop: Spacing.sm }}>
          Scan barcodes on supplements and food products to instantly see their macros and log them to your library.
        </Text>

        <Card padding="lg" style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={48} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: Spacing.md }} />
          <Text variant="h3" center>Camera Access Required</Text>
          <Text variant="body" muted center style={{ marginTop: Spacing.sm }}>
            PulseFit needs camera access to scan barcodes. Your camera is never used to record or stream — only to detect barcodes in real time.
          </Text>
          <Button
            label="Grant Camera Access"
            onPress={requestPermission}
            style={{ marginTop: Spacing.lg }}
            testID="grant-camera-btn"
          />
        </Card>

        <RecentScans recent={recent} onPress={(id) => router.push(`/scanned/${id}`)} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.cameraWrap, { marginTop: insets.top }]}>
        <CameraView
          onBarcodeScanned={loading ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
          style={StyleSheet.absoluteFill}
        />
        {/* Scanning reticle overlay */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.reticle}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text variant="body" center style={styles.hint}>
            {loading ? 'Looking up product...' : 'Point at a barcode'}
          </Text>
        </View>

        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Recent scans strip below the camera */}
      <View style={[styles.recentStrip, { paddingBottom: insets.bottom + 80 }]}>
        <RecentScans recent={recent} onPress={(id) => router.push(`/scanned/${id}`)} />
      </View>
    </View>
  );
}

function RecentScans({ recent, onPress }: { recent: ScannedProduct[]; onPress: (id: number) => void }) {
  if (recent.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" muted center>Scanned products will appear here.</Text>
      </View>
    );
  }
  return (
    <View style={styles.recentList}>
      <Text variant="label" muted style={styles.recentTitle}>RECENT SCANS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recent.slice(0, 8).map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onPress(p.id)}
            style={({ pressed }) => [styles.recentItem, pressed && { opacity: 0.7 }]}
          >
            <Text variant="caption" numberOfLines={1} style={styles.recentItemName}>{p.name}</Text>
            <Text variant="caption" muted numberOfLines={1}>{p.brand ?? 'Unknown brand'}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  permissionCard: {
    marginTop: Spacing.xl,
  },
  cameraWrap: {
    flex: 1,
    overflow: 'hidden',
    borderBottomLeftRadius: Radii.xl,
    borderBottomRightRadius: Radii.xl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.4,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },
  hint: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    color: '#FFFFFF',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentStrip: {
    backgroundColor: Colors.background,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  recentList: {
    gap: Spacing.sm,
  },
  recentTitle: {
    marginBottom: Spacing.xs,
  },
  recentItem: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    minWidth: 140,
    maxWidth: 200,
  },
  recentItemName: {
    maxWidth: 180,
  },
  empty: {
    padding: Spacing.xl,
  },
});
