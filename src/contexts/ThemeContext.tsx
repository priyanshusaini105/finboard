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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Use Zustand store for theme management
  const theme = useStore((state) => state.theme);
  const setThemeInStore = useStore((state) => state.setTheme);

  // Apply theme to document whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    console.log("🎨 Applying theme:", theme);
    // Apply to both html and body elements to ensure compatibility
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    console.log("🎨 Document classes:", document.documentElement.className);
  }, [theme]);

  const toggleTheme = () => {
    console.log("🔄 Toggling theme from", theme);
    setThemeInStore(theme === "light" ? "dark" : "light");
  };

  const setTheme = (newTheme: Theme) => {
    setThemeInStore(newTheme);
  };

  // Return a stable structure to prevent hydration mismatch
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
