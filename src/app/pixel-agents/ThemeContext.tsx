"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { themes, getThemeById } from "./themes";
import type { Theme } from "./themes";

interface ThemeContextValue {
  theme: Theme;
  themeId: string;
  setTheme: (id: string) => void;
  themes: typeof themes;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes[0],
  themeId: themes[0].id,
  setTheme: () => {},
  themes,
});

const STORAGE_KEY = "pixel-hq-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<string>(themes[0].id);

  // Load saved theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && themes.some(t => t.id === saved)) {
        setThemeId(saved);
      }
    } catch {}
  }, []);

  // Save theme to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {}
  }, [themeId]);

  const theme = getThemeById(themeId);

  const setTheme = setThemeId;

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
