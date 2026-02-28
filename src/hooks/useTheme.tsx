import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

type ThemeMode = 'dark' | 'light' | 'auto';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'auto',
  resolved: 'dark',
  setMode: () => {},
});

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') return getSystemTheme();
  return mode;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.classList.toggle('light', resolved === 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('infradar-theme');
    if (saved === 'dark' || saved === 'light' || saved === 'auto') return saved;
    return 'auto';
  });

  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(mode));

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem('infradar-theme', m);
  }, []);

  // Re-resolve when mode changes
  useEffect(() => {
    const r = resolveTheme(mode);
    setResolved(r);
    applyTheme(r);
  }, [mode]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (mode !== 'auto') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const r = getSystemTheme();
      setResolved(r);
      applyTheme(r);
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
