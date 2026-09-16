/**
 * P2G Commercial Monochromatic Design System - Color Palette
 * Strictly shades of black, white, and grey for an ultra-luxury, high-contrast aesthetic.
 */

export const colors = {
  // Pure Core
  black: '#000000',
  white: '#FFFFFF',

  // Dark & Surface Shades
  blackOff: '#0A0A0A',      // Near-black for dark hero cards and high-contrast surfaces
  charcoalDark: '#121212',  // Elevated dark containers
  charcoal: '#1A1A1A',      // Secondary dark surfaces, dark buttons
  charcoalLight: '#242424', // Card backgrounds in dark containers

  // Grey Scale (High contrast, balanced progression)
  grey900: '#171717',
  grey850: '#212121',
  grey800: '#2A2A2A',       // Subtle borders on dark
  grey700: '#3D3D3D',       // Dark dividers
  grey600: '#525252',       // Heavy muted text
  grey500: '#737373',       // Secondary text / icon color (WCAG AA compliant)
  grey400: '#8E8E93',       // Inactive / placeholder text
  grey300: '#C7C7CC',       // Medium light borders, drag handles
  grey200: '#E5E5EA',       // Standard light borders, input outlines
  grey150: '#ECECEE',       // Secondary divider
  grey100: '#F2F2F7',       // Pill backgrounds, input fills, subtle badges
  grey50: '#F8F9FA',        // App canvas background

  // Semantic Aliases
  primary: '#000000',
  primaryText: '#0A0A0A',
  secondary: '#1A1A1A',
  secondaryText: '#555555',
  tertiaryText: '#8E8E93',
  inverseText: '#FFFFFF',
  inverseMuted: '#D4D4D4',

  // Canvas & Surfaces
  canvas: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceSubtle: '#F2F2F7',
  surfaceDark: '#0A0A0A',
  surfaceElevated: '#171717',

  // Borders
  border: '#E5E5EA',
  borderDark: '#262626',
  borderFocus: '#000000',
  borderSubtle: '#F0F0F2',

  // Badges & Status (Monochrome scale)
  badgeActiveBg: '#000000',
  badgeActiveText: '#FFFFFF',
  badgeInactiveBg: '#F2F2F7',
  badgeInactiveText: '#555555',
  badgeInactiveBorder: '#E5E5EA',
  badgePendingBg: '#ECECEC',
  badgePendingText: '#1A1A1A',
  badgePendingBorder: '#D4D4D4',
};

export default colors;
