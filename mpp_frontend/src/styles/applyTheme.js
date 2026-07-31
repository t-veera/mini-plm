import { THEMES, DEFAULT_THEME, STORAGE_KEY, cssVar } from './themes';

/** The stored theme, falling back to the OS preference and then the default. */
export function readStoredTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES[saved]) return saved;
  } catch (error) {
    // Private mode / storage disabled - fall through to the OS preference.
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return DEFAULT_THEME;
}

/**
 * Write a theme's tokens onto <html> as CSS custom properties.
 *
 * Everything that paints reads those properties, so this one call re-themes the whole
 * UI - no component re-render required.
 */
export default function applyTheme(name) {
  const themeName = THEMES[name] ? name : DEFAULT_THEME;
  const root = document.documentElement;

  Object.entries(THEMES[themeName]).forEach(([key, value]) => {
    root.style.setProperty(cssVar(key), value);
  });

  root.setAttribute('data-theme', themeName);
  // Tells the browser to match native UI (scrollbars, form controls, autofill).
  root.style.colorScheme = themeName === 'light' ? 'light' : 'dark';
}

/**
 * Apply the stored theme before React renders.
 *
 * Called from index.js so the first paint is already themed - doing it in an effect
 * would flash the default theme first.
 */
export function bootstrapTheme() {
  applyTheme(readStoredTheme());
}
