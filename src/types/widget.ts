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
  // Real-time/WebSocket support
  enableRealtime?: boolean; // Enable real-time data via WebSocket
  realtimeProvider?: 'finnhub' | 'custom'; // WebSocket provider
  realtimeSymbol?: string; // Symbol/identifier for real-time subscription
  websocketUrl?: string; // WebSocket URL for real-time connection
  websocketSymbols?: string[]; // Multiple symbols for WebSocket subscription
}

export enum WidgetType {
  CARD = "card",
  TABLE = "table",
  CHART = "chart",
}

export interface WidgetConfig {
  name: string;
  apiUrl?: string; // Optional when using WebSocket only
  refreshInterval: number;
  displayMode: "card" | "table" | "chart";
  selectedFields: string[];
  headers?: Record<string, string>;
  enableRealtime?: boolean;
  realtimeProvider?: 'finnhub' | 'custom';
  realtimeSymbol?: string;
  websocketUrl?: string; // WebSocket URL for real-time connection
  websocketSymbols?: string[]; // Multiple symbols for WebSocket subscription
}

export interface APIField {
  key: string;
  value: unknown;
  type: string;
}
