"use client";

import { ReactNode } from "react";

interface DashboardPersistenceProps {
  children: ReactNode;
}

/**
 * Component that wraps children and handles dashboard state persistence
 * Uses Zustand for state management with localStorage persistence
 * 
 * NOTE: This component is deprecated. Zustand persist middleware handles 
 * persistence automatically. This wrapper is kept for backwards compatibility.
 */
export function DashboardPersistence({
  children,
}: DashboardPersistenceProps) {
  // No longer needed - Zustand persist middleware handles persistence

  return <>{children}</>;
}
