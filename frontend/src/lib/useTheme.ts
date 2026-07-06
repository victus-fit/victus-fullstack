import { useEffect, useState } from 'react';

export type ThemeName = 'light' | 'dark';

const storageKey = 'victus-theme';

function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(storageKey);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  };
}
