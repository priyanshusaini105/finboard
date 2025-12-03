"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

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
  const [theme, setThemeState] = useState<Theme>(() => {
    // Only initialize with saved theme or system preference on client
    if (typeof window === "undefined") {
      return "dark";
    }
    
    const savedTheme = localStorage.getItem("finboard-theme") as Theme;
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      return savedTheme;
    }
    // Check system preference
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    return systemTheme;
  });

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    if (typeof window === "undefined") return;
    
    console.log("🎨 Applying theme:", newTheme);
    // Apply to both html and body elements to ensure compatibility
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    localStorage.setItem("finboard-theme", newTheme);
    console.log("🎨 Document classes:", document.documentElement.className);
  };

  // Apply theme when component mounts or theme changes
  if (typeof window !== "undefined") {
    applyTheme(theme);
  }

  const toggleTheme = () => {
    console.log("🔄 Toggling theme from", theme);
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
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
