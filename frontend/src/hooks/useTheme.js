import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hop.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// public/theme.js applies a saved choice before the first paint; this hook keeps React in
// step with it and lets the header toggle switch themes.
function effectiveTheme() {
  const chosen = document.documentElement.dataset.theme;
  if (chosen) return chosen;
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(effectiveTheme);

  // Until the user picks a theme, follow the system setting as it changes.
  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return undefined;
    const follow = () => setTheme(effectiveTheme());
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, []);

  const toggle = useCallback(() => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies until the page is reloaded.
    }
    setTheme(next);
  }, []);

  return { theme, toggle };
}
