/**
 * P2G Commercial Monochromatic Design System - Central Theme Export
 * Unified tokens for colors, typography, spacing, radius, and standard component styles.
 */

import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import radius from './radius';

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
};

export { colors, typography, spacing, radius };
export default theme;
