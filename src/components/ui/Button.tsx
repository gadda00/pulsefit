/**
 * Button — primary CTA component.
 *
 * Variants:
 *  - primary: solid electric-green background, dark text — the main CTA.
 *  - secondary: outline with green border, green text.
 *  - ghost: transparent background, white text — used on dark surfaces.
 *  - danger: solid red, white text — destructive actions (delete, reset).
 *
 * Sizes:
 *  - sm: 36px tall, used in dense lists.
 *  - md: 48px tall, default.
 *  - lg: 56px tall, used on the home screen as the main "Start workout" CTA.
 */

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

const sizeStyles: Record<Size, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { height: 36, paddingHorizontal: Spacing.md },
    text: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  },
  md: {
    container: { height: 48, paddingHorizontal: Spacing.lg },
    text: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.semibold },
  },
  lg: {
    container: { height: 56, paddingHorizontal: Spacing.xl },
    text: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  },
};

const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle; pressed: ViewStyle }> = {
  primary: {
    container: { backgroundColor: Colors.primary },
    text: { color: '#0A0A0A' },
    pressed: { opacity: 0.85 },
  },
  secondary: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
    text: { color: Colors.primary },
    pressed: { backgroundColor: Colors.primaryDim },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: Colors.text },
    pressed: { backgroundColor: Colors.surface },
  },
  danger: {
    container: { backgroundColor: Colors.danger },
    text: { color: '#FFFFFF' },
    pressed: { opacity: 0.85 },
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sz = sizeStyles[size];
  const vr = variantStyles[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sz.container,
        vr.container,
        pressed && vr.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={vr.text.color} size="small" />
        ) : (
          <>
            {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
            <Text style={[styles.text, sz.text, vr.text]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    marginRight: Spacing.xs,
  },
  text: {
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.4,
  },
});
