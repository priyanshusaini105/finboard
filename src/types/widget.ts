export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  apiUrl?: string;
  refreshInterval: number;
  data?: Record<string, unknown> | unknown[];
  originalData?: Record<string, unknown> | unknown[]; // Store original data for field mapping
  isLoading?: boolean;
  error?: string;
  // Grid-based layout properties (Apitable-inspired)
  x?: number; // Horizontal position (column index)
  y: number; // Vertical position in grid units
  w?: number; // Width in columns (default 2)
  height: number; // Height in grid units (1 unit = 16px)
  selectedFields?: string[];
  headers?: Record<string, string>;
}

export enum WidgetType {
  CARD = "card",
  TABLE = "table",
  CHART = "chart",
}

export interface WidgetConfig {
  name: string;
  apiUrl: string;
  refreshInterval: number;
  displayMode: "card" | "table" | "chart";
  selectedFields: string[];
  headers?: Record<string, string>;
}

export interface APIField {
  key: string;
  value: unknown;
  type: string;
}
