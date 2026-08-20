/**
 * Theme palettes.
 *
 * This is the single place colours are defined. Everything else - the `styles` token
 * object, the global stylesheet, component CSS - reads them as CSS custom properties,
 * so switching themes is one attribute change on <html> rather than a re-render.
 *
 * Adding a theme: add an entry here with the SAME keys as `dark`. Nothing else needs
 * to change; the switcher lists whatever is defined.
 */

export const STORAGE_KEY = 'mini-plm-theme';
export const DEFAULT_THEME = 'dark';

/** camelCase token -> CSS custom property name. `darkAlt` -> `--mp-dark-alt`. */
export const cssVar = (key) => `--mp-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

/** camelCase token -> the `var(...)` reference used in inline styles. */
export const token = (key) => `var(${cssVar(key)})`;

export const THEMES = {
  dark: {
    // Surfaces
    dark: '#171B24',
    darkAlt: '#1F2937',
    border: '#374151',
    transparent: 'rgba(241, 245, 244, 0.24)',

    // Neutrals / status
    primary: '#6B7280',
    secondary: '#9CA3AF',
    warning: '#D97706',
    success: '#059669',
    danger: '#DC2626',

    // Container identity: iteration ("disc") green, stage (torii) amber
    iteration: '#4F9B6E',
    stage: '#FFB853',

    // Text
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    textInverse: '#1F2937',

    // Translucent fills. These exist as tokens because appending an alpha suffix to a
    // hex string (`${primary}26`) cannot work once colours are CSS variables.
    primarySoft: 'rgba(107, 114, 128, 0.15)',
    primaryActive: 'rgba(107, 114, 128, 0.20)',
    iterationSoft: 'rgba(79, 155, 110, 0.15)',
    iterationFaint: 'rgba(79, 155, 110, 0.12)',
    iterationEdge: 'rgba(79, 155, 110, 0.33)',
    stageSoft: 'rgba(255, 184, 83, 0.15)',

    hover: 'rgba(255, 255, 255, 0.06)',
    shadow: 'rgba(0, 0, 0, 0.55)',
    overlay: 'rgba(0, 0, 0, 0.70)',
    // Backdrop behind previewed images/3D scenes - deliberately darker than the page.
    canvas: '#0D0F14',
  },

  light: {
    // Off-white page with white panels, so elevation reads without heavy borders.
    dark: '#F6F7F9',
    darkAlt: '#FFFFFF',
    border: '#E3E7ED',
    transparent: 'rgba(15, 23, 42, 0.16)',

    primary: '#64748B',
    secondary: '#94A3B8',
    // Darkened so status colours stay legible on a light background.
    warning: '#B45309',
    success: '#047857',
    danger: '#DC2626',

    // Darkened until both clear WCAG AA (4.5:1) on the light background - the brighter
    // dark-theme green/amber measure 3.14 and 1.60 here, too low for the BOM totals and
    // container badges that use them as text.
    iteration: '#208047',
    stage: '#99600F',

    text: '#14181F',
    textMuted: '#66707E',
    textInverse: '#FFFFFF',

    primarySoft: 'rgba(100, 116, 139, 0.14)',
    primaryActive: 'rgba(100, 116, 139, 0.20)',
    iterationSoft: 'rgba(32, 128, 71, 0.14)',
    iterationFaint: 'rgba(32, 128, 71, 0.10)',
    iterationEdge: 'rgba(32, 128, 71, 0.35)',
    stageSoft: 'rgba(153, 96, 15, 0.16)',

    hover: 'rgba(15, 23, 42, 0.05)',
    shadow: 'rgba(15, 23, 42, 0.18)',
    overlay: 'rgba(15, 23, 42, 0.45)',
    canvas: '#EDEFF3',
  },
};

/** Shown in the theme switcher. */
export const THEME_META = {
  dark: { label: 'Dark', description: 'Default low-light palette' },
  light: { label: 'Light', description: 'Bright, high-contrast' },
};
