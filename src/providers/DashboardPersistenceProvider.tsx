"use client";

import { ReactNode } from "react";
import { useDashboardPersistence } from "../hooks/useDashboardPersistence";

interface DashboardPersistenceProps {
  children: ReactNode;
}

/**
 * Component that wraps children and handles dashboard state persistence
 * Uses Zustand for state management with localStorage persistence
 */
export function DashboardPersistence({
  children,
}: DashboardPersistenceProps) {
  // Initialize dashboard persistence on mount
  useDashboardPersistence();

  return <>{children}</>;
}
