"use client";

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { useStore } from "@/src/store";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function OptimizedThemeProvider({ children }: ThemeProviderProps) {
  // Use Zustand store for theme management
  const theme = useStore((state) => state.theme);
  const setThemeInStore = useStore((state) => state.setTheme);

  // Apply theme to document whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeInStore(theme === "light" ? "dark" : "light");
  };

  const setTheme = (newTheme: Theme) => {
    setThemeInStore(newTheme);
  };

  // Return a stable structure to prevent hydration mismatch
  const value = {
    theme,
    toggleTheme,
    setTheme,
    mounted: true,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within an OptimizedThemeProvider");
  }
  return context;
}
