/**
 * Text — themed text component with semantic variants.
 *
 * Why a wrapper around RN.Text?
 *  - All text defaults to white (the dark theme's primary text color), so
 *    screens don't have to repeat `style={{ color: '#fff' }}` everywhere.
 *  - Variants ('h1', 'h2', 'body', 'caption', ...) enforce consistent type
 *    scales across the app — you can't accidentally use 17px body text on
 *    one screen and 16px on another.
 *  - The `muted` and `accent` props give quick access to the secondary text
 *    and brand colors without reaching into the theme module.
 */

import React from 'react';
import { Text as RNText, TextStyle, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

export type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyLarge' | 'caption' | 'label' | 'mono';

export interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  muted?: boolean;
  accent?: boolean;
  bold?: boolean;
  semibold?: boolean;
  center?: boolean;
  style?: TextStyle;
  numberOfLines?: number;
  testID?: string;
  accessibilityLabel?: string;
}

const variantStyles: Record<TextVariant, TextStyle> = {
  display: { fontSize: Typography.fontSize.display, fontWeight: Typography.fontWeight.heavy as TextStyle['fontWeight'], lineHeight: Typography.fontSize.display * Typography.lineHeight.tight },
  h1: { fontSize: Typography.fontSize.xxxl, fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'], lineHeight: Typography.fontSize.xxxl * Typography.lineHeight.tight },
  h2: { fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'], lineHeight: Typography.fontSize.xxl * Typography.lineHeight.tight },
  h3: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.semibold as TextStyle['fontWeight'], lineHeight: Typography.fontSize.xl * Typography.lineHeight.normal },
  bodyLarge: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.regular as TextStyle['fontWeight'], lineHeight: Typography.fontSize.lg * Typography.lineHeight.relaxed },
  body: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.regular as TextStyle['fontWeight'], lineHeight: Typography.fontSize.md * Typography.lineHeight.relaxed },
  caption: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.regular as TextStyle['fontWeight'], lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal },
  label: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold as TextStyle['fontWeight'], letterSpacing: 0.6, textTransform: 'uppercase' },
  mono: { fontSize: Typography.fontSize.md, fontFamily: 'Courier', fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'] },
};

export function Text({
  children,
  variant = 'body',
  muted = false,
  accent = false,
  bold = false,
  semibold = false,
  center = false,
  style,
  numberOfLines,
  testID,
  accessibilityLabel,
}: TextProps) {
  const variantStyle = variantStyles[variant];
  const color = accent ? Colors.primary : muted ? Colors.textSecondary : Colors.text;
  const fontWeight: TextStyle['fontWeight'] = bold
    ? Typography.fontWeight.bold
    : semibold
      ? Typography.fontWeight.semibold
      : variantStyle.fontWeight;

  return (
    <RNText
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        variantStyle,
        { color, fontWeight, textAlign: center ? 'center' : 'auto' },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    // fontFamily defaults to System — handles SF on iOS and Roboto on Android.
  },
});
