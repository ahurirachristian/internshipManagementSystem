import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { applyThemeVariables, DEFAULT_THEME } from '../theme';

const ThemeContext = createContext(null);

const STORAGE_COLOR = 'riho_primary_color';
const STORAGE_DARK = 'riho_dark_mode';

function readStoredColor() {
  try {
    const stored = localStorage.getItem(STORAGE_COLOR);
    return stored || DEFAULT_THEME.primary;
  } catch {
    return DEFAULT_THEME.primary;
  }
}

function readStoredDark() {
  try {
    const stored = localStorage.getItem(STORAGE_DARK);
    if (stored !== null) return stored === 'true';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }) {
  const [primaryColor, setPrimaryColorState] = useState(readStoredColor);
  const [isDark, setIsDark] = useState(readStoredDark);

  useEffect(() => {
    applyThemeVariables(primaryColor, isDark);
    try {
      localStorage.setItem(STORAGE_COLOR, primaryColor);
      localStorage.setItem(STORAGE_DARK, String(isDark));
    } catch {
      // ignore storage failures
    }
  }, [primaryColor, isDark]);

  const value = useMemo(
    () => ({
      primaryColor,
      setPrimaryColor: setPrimaryColorState,
      isDark,
      toggleDark: () => setIsDark((d) => !d),
      resetTheme: () => {
        setPrimaryColorState(DEFAULT_THEME.primary);
        setIsDark(() =>
          typeof window !== 'undefined' && window.matchMedia
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : false
        );
      },
    }),
    [primaryColor, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
