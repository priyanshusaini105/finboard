export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  refreshInterval: number;
  data?: any;
  isLoading?: boolean;
  error?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export enum WidgetType {
  CARD = "card",
  TABLE = "table",
  CHART = "chart",
}

export interface WidgetConfig {
  name: string;
  refreshInterval: number;
  displayMode: "card" | "table" | "chart";
}

export interface APIField {
  key: string;
  value: any;
  type: string;
}
