'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId = 'cyan' | 'violet' | 'emerald' | 'crimson';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  label: string;
  color: string;
  secondary: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    label: 'Кибер Циан',
    color: '#06b6d4',
    secondary: '#38bdf8',
  },
  {
    id: 'violet',
    name: 'Synthwave Violet',
    label: 'Синтвейв Фиолетовый',
    color: '#a855f7',
    secondary: '#ec4899',
  },
  {
    id: 'emerald',
    name: 'Matrix Emerald',
    label: 'Матричный Изумруд',
    color: '#10b981',
    secondary: '#34d399',
  },
  {
    id: 'crimson',
    name: 'Crimson Blood',
    label: 'Багровый Неон',
    color: '#f43f5e',
    secondary: '#ef4444',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  currentTheme: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'cyan',
  setTheme: () => {},
  currentTheme: THEMES[0],
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('cyan');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gamevault_theme') as ThemeId | null;
      if (saved && THEMES.some((t) => t.id === saved)) {
        setThemeState(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        document.documentElement.setAttribute('data-theme', 'cyan');
      }
    } catch {
      // localStorage may be unavailable
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('gamevault_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch {
      // localStorage may be unavailable
    }
  };

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
