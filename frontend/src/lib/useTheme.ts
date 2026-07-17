import { useEffect } from 'react';

export type ThemeName = 'dark';

const storageKey = 'victus-theme';

export function useTheme() {
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
    window.localStorage.setItem(storageKey, 'dark');
  }, []);

  return {
    theme: 'dark' as ThemeName,
  };
}
