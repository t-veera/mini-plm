import { useState, useEffect } from 'react';

const STORAGE_KEY = 'mini-plm-icon-theme';

function useIconTheme() {
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'material';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTheme);
  }, [activeTheme]);

  return { activeTheme, setActiveTheme };
}

export default useIconTheme;

