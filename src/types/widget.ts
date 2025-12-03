export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  apiUrl?: string;
  refreshInterval: number;
  data?: any;
  originalData?: any; // Store original data for field mapping
  isLoading?: boolean;
  error?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
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
  value: any;
  type: string;
}
