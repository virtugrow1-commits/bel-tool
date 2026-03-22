import { useState, useEffect, useCallback } from 'react';
import { store } from '@/lib/beltool-store';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = store.get<Theme>('theme', 'system');
    applyTheme(saved);
    return saved;
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    store.set('theme', t);
    applyTheme(t);
  }, []);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  const isDark = resolvedTheme === 'dark';

  return { theme, setTheme, isDark };
}
