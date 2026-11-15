'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type BackgroundId = 'cyber-grid' | 'nebula-abyss' | 'dark-hex' | 'pure-obsidian';

export interface BackgroundConfig {
  id: BackgroundId;
  name: string;
  label: string;
  description: string;
}

export const BACKGROUNDS: BackgroundConfig[] = [
  {
    id: 'cyber-grid',
    name: 'Cyber Grid',
    label: 'Cyber Grid',
    description: '3D неоновая сетка, лёгкая дымка и неоновые световые пятна',
  },
  {
    id: 'nebula-abyss',
    name: 'Nebula Abyss',
    label: 'Nebula Abyss',
    description: 'Глубокий космос, пульсирующие туманности и звёзды',
  },
  {
    id: 'dark-hex',
    name: 'Dark Hex / Matrix',
    label: 'Dark Hex',
    description: 'Технологичные шестиугольники, сетка и виньетка',
  },
  {
    id: 'pure-obsidian',
    name: 'Pure Obsidian',
    label: 'Pure Obsidian',
    description: 'Минималистичный строгий тёмный фон с лёгким градиентом',
  },
];

const STORAGE_KEY = 'gamevault_bg';
const DEFAULT_BG: BackgroundId = 'cyber-grid';

interface BackgroundContextType {
  background: BackgroundId;
  setBackground: (bg: BackgroundId) => void;
  currentBackground: BackgroundConfig;
}

const BackgroundContext = createContext<BackgroundContextType>({
  background: DEFAULT_BG,
  setBackground: () => {},
  currentBackground: BACKGROUNDS[0],
});

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundId>(DEFAULT_BG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as BackgroundId | null;
      if (saved && BACKGROUNDS.some((b) => b.id === saved)) {
        setBackgroundState(saved);
        document.documentElement.setAttribute('data-bg', saved);
      } else {
        document.documentElement.setAttribute('data-bg', DEFAULT_BG);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const setBackground = (newBg: BackgroundId) => {
    setBackgroundState(newBg);
    try {
      localStorage.setItem(STORAGE_KEY, newBg);
      document.documentElement.setAttribute('data-bg', newBg);
    } catch {
      // localStorage may be unavailable
    }
  };

  const currentBackground =
    BACKGROUNDS.find((b) => b.id === background) || BACKGROUNDS[0];

  return (
    <BackgroundContext.Provider value={{ background, setBackground, currentBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  return useContext(BackgroundContext);
}
