"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "../contexts/ThemeContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
