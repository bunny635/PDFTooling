import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const STORAGE_KEY = 'pdftooling-theme';
const VALID_THEMES = ['system', 'light', 'dark'];

export const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredPreference() {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage might be unavailable or blocked (e.g. private browsing)
  }
  return 'system';
}

function applyThemeClass(effectiveTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = effectiveTheme;
}

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreferenceState] = useState(getStoredPreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Compute effective theme based on preference and OS setting
  const effectiveTheme = useMemo(() => {
    if (themePreference === 'light') return 'light';
    if (themePreference === 'dark') return 'dark';
    return systemTheme;
  }, [themePreference, systemTheme]);

  // Update DOM when effective theme changes
  useEffect(() => {
    applyThemeClass(effectiveTheme);
  }, [effectiveTheme]);

  // Listen for OS system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const setThemePreference = (newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return;
    setThemePreferenceState(newTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Storage unavailable or quota exceeded; state still updates
    }
  };

  const contextValue = useMemo(() => ({
    themePreference,
    effectiveTheme,
    setThemePreference,
  }), [themePreference, effectiveTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
