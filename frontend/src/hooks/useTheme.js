import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { settingsRepo } from '../db/repositories/settingsRepo.js';

export function useTheme() {
  const storedTheme = useLiveQuery(() => settingsRepo.get('theme', 'light'), [], 'light');
  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme() {
      const isDark =
        storedTheme === 'dark';

      if (isDark) {
        root.classList.add('dark');
        setResolvedTheme('dark');
      } else {
        root.classList.remove('dark');
        setResolvedTheme('light');
      }
    }

    applyTheme();

    const listener = () => {
      if (storedTheme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [storedTheme]);

  const setTheme = async (newTheme) => {
    await settingsRepo.set('theme', newTheme);
  };

  return {
    theme: storedTheme || 'light',
    resolvedTheme,
    setTheme,
  };
}
