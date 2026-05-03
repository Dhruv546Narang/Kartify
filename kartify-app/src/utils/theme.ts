/**
 * Kartify Design System — Colors, Spacing, Typography
 * Premium dark-mode-first design tokens
 */

export const Colors = {
  // Primary sage-green palette
  primary: {
    50: '#eef6ef',
    100: '#deecdf',
    200: '#c1ddc4',
    300: '#a3cda8',
    400: '#86bc8c',
    500: '#6ea474',
    600: '#57885d',
    700: '#436b48',
    800: '#31513a',
    900: '#21392a',
  },

  // Surface/background palette
  surface: {
    50: '#f7fbf8',
    100: '#eff6f1',
    200: '#deecdf',
    300: '#c4d8c7',
    400: '#9ab2a0',
    500: '#738a79',
    600: '#556c5c',
    700: '#3d5245',
    800: '#2a3d33',
    900: '#1c2f26',
    950: '#111f18',
  },

  // Accent colors for platform badges & highlights
  accent: {
    emerald: '#6ea474',
    amber: '#f3ca52',
    rose: '#f0627d',
    sky: '#6fb8d6',
    teal: '#58a897',
    orange: '#efab62',
  },

  // Semantic
  success: '#6ea474',
  warning: '#f3ca52',
  error: '#ef4444',
  info: '#5f9bb8',

  // Text
  text: {
    primary: '#e8f4eb',
    secondary: '#a8bfaf',
    muted: '#7a9785',
    inverse: '#1f3a2e',
  },

  // Gradients (start, end)
  gradients: {
    primary: ['#6ea474', '#436b48'],
    dark: ['#1c2f26', '#2a3d33'],
    card: ['#2a3d33', '#1c2f26'],
    accent: ['#6ea474', '#f3ca52'],
  },
} as const;

// Platform brand colors
export const PlatformColors: Record<string, string> = {
  blinkit: '#F7CB46',
  zepto: '#7B2FF2',
  instamart: '#FC8019',
  bigbasket: '#84C225',
  jiomart: '#0078AD',
  default: '#6ea474',
};

// Platform display names
export const PlatformNames: Record<string, string> = {
  blinkit: 'Blinkit',
  zepto: 'Zepto',
  instamart: 'Instamart',
  bigbasket: 'BigBasket',
  jiomart: 'JioMart',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
} as const;
