"use client";

import { ReactNode } from "react";
import { useDashboardPersistence } from "../hooks/useDashboardPersistence";

interface DashboardPersistenceProps {
  children: ReactNode;
}

/**
 * Component that wraps children and handles dashboard state persistence
 * Must be used inside Redux Provider
 */
export function DashboardPersistence({
  children,
}: DashboardPersistenceProps) {
  // Initialize dashboard persistence on mount
  useDashboardPersistence();

  return <>{children}</>;
}
