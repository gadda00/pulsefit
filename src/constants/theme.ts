/**
 * PulseFit design tokens.
 *
 * Single source of truth for colors, spacing, typography and radii.
 * The palette is a modern-dark theme with electric green (#00E676) as the
 * primary accent on a near-black background (#0A0A0A). All values are tuned
 * for WCAG-AA contrast against the dark background.
 */

export const Colors = {
  // Surfaces
  background: '#0A0A0A',           // app background
  surface: '#141414',              // cards / sheets
  surfaceElevated: '#1C1C1C',      // elevated cards, modals
  surfaceMuted: '#0F0F0F',         // lists between rows

  // Borders / dividers
  border: '#262626',
  borderMuted: '#1A1A1A',
  divider: '#1F1F1F',

  // Text
  text: '#FFFFFF',
  textSecondary: '#B8B8B8',
  textMuted: '#7A7A7A',
  textDisabled: '#4A4A4A',

  // Brand
  primary: '#00E676',              // electric green
  primaryMuted: '#00B85F',
  primaryDim: 'rgba(0, 230, 118, 0.15)',
  primaryGlow: 'rgba(0, 230, 118, 0.35)',

  // Semantic
  success: '#00E676',
  warning: '#FFB300',
  danger: '#FF5252',
  info: '#40C4FF',

  // Categories (used for exercise chips and chart series)
  category: {
    chest: '#FF5252',
    back: '#40C4FF',
    shoulders: '#FFB300',
    arms: '#E040FB',
    legs: '#00E676',
    core: '#FF6E40',
    cardio: '#FF80AB',
    fullbody: '#B388FF',
  } as const,

  // Charts palette (8 distinct colors for series)
  chartPalette: [
    '#00E676', '#40C4FF', '#FFB300', '#FF5252',
    '#E040FB', '#FF6E40', '#B388FF', '#FF80AB',
  ] as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 0,
  },
} as const;

export const Layout = {
  screenWidth: 375,  // default; updated at runtime via Dimensions
  tabBarHeight: 60,
  headerHeight: 56,
  horizontalPadding: Spacing.lg,
} as const;

export type Theme = typeof Colors & {
  spacing: typeof Spacing;
  radii: typeof Radii;
  typography: typeof Typography;
  shadows: typeof Shadows;
  layout: typeof Layout;
};

export const theme: Theme = {
  ...Colors,
  spacing: Spacing,
  radii: Radii,
  typography: Typography,
  shadows: Shadows,
  layout: Layout,
};
