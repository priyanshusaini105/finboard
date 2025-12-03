"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    console.log("🎨 Theme toggle clicked, current theme:", theme);
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className="relative p-2 rounded-lg border transition-all duration-300 ease-in-out
                 bg-white dark:bg-slate-800 
                 border-slate-200 dark:border-slate-700
                 text-slate-700 dark:text-slate-300
                 hover:bg-slate-50 dark:hover:bg-slate-700
                 hover:border-slate-300 dark:hover:border-slate-600
                 shadow-sm hover:shadow-md"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
            theme === "light"
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 rotate-90 scale-75"
          }`}
        />
        <Moon
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
            theme === "dark"
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 -rotate-90 scale-75"
          }`}
        />
      </div>
    </button>
  );
}
