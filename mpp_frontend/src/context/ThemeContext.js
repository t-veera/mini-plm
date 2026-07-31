import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { THEMES, THEME_META, STORAGE_KEY } from '../styles/themes';
import applyTheme, { readStoredTheme } from '../styles/applyTheme';

const ThemeContext = createContext(null);

/**
 * Owns which theme is active and persists the choice.
 *
 * The actual painting is done by CSS custom properties on <html> (see applyTheme), so
 * this provider only needs to sit above whatever renders the switcher - components
 * reading `styles.colors.*` re-theme themselves without subscribing to this context.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Storage unavailable - the theme still applies for this session.
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (THEMES[next]) setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
    // Whatever is defined in themes.js, so adding a palette needs no change here.
    available: Object.keys(THEMES).map((key) => ({ key, ...THEME_META[key] })),
  }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

export default ThemeContext;
