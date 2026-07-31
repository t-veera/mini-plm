import typography from '../styles/typography';
import { token } from '../styles/themes';

/**
 * Design tokens used by inline styles across the app.
 *
 * Colours are `var(--mp-*)` references rather than literal values, so every component
 * that already reads `styles.colors.*` follows the active theme with no change of its
 * own. The values behind these variables live in styles/themes.js.
 *
 * Note: because these are CSS variables, you cannot build a translucent variant by
 * appending an alpha suffix (`${styles.colors.primary}26` no longer works). Use the
 * pre-mixed tokens below - primarySoft, iterationSoft and friends - or add a new one.
 */
const styles = {
  colors: {
    dark: token('dark'),
    darkAlt: token('darkAlt'),
    border: token('border'),
    transparent: token('transparent'),

    primary: token('primary'),
    secondary: token('secondary'),
    warning: token('warning'),
    success: token('success'),
    danger: token('danger'),

    iteration: token('iteration'),
    stage: token('stage'),

    // Pre-mixed translucent fills.
    primarySoft: token('primarySoft'),
    primaryActive: token('primaryActive'),
    iterationSoft: token('iterationSoft'),
    iterationFaint: token('iterationFaint'),
    iterationEdge: token('iterationEdge'),
    stageSoft: token('stageSoft'),

    hover: token('hover'),
    shadow: token('shadow'),
    overlay: token('overlay'),
    canvas: token('canvas'),

    text: {
      light: token('text'),
      muted: token('textMuted'),
      dark: token('textInverse'),
    },
  },
  fonts: {
    family: typography.primary,
    size: {
      xs: '0.75rem',
      sm: '0.85rem',
      md: '1rem',
      lg: '1.25rem',
    },
    weight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '3px',
    md: '4px',
    lg: '6px',
  },
};

export default styles;
