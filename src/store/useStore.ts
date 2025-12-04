import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Widget, WidgetConfig, WidgetType } from "@/src/types";

interface DashboardConfig {
  theme?: "dark" | "light";
  layoutMode?: "grid" | "list";
  refreshInterval?: number;
}

interface DashboardState {
  // Dashboard UI state
  isAddModalOpen: boolean;
  editingWidget: Widget | null;
  expandedWidget: Widget | null;
  theme: "dark" | "light";
  layoutMode: "grid" | "list";
  refreshInterval: number;
  
  // Widgets state
  widgets: Widget[];
  
  // Dashboard actions
  openAddModal: () => void;
  openEditModal: (widget: Widget) => void;
  openExpandModal: (widget: Widget) => void;
  closeModal: () => void;
  closeExpandModal: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setLayoutMode: (mode: "grid" | "list") => void;
  setGlobalRefreshInterval: (interval: number) => void;
  
  // Widget actions
  addWidget: (config: WidgetConfig, id: string) => void;
  updateWidget: (id: string, config: WidgetConfig) => void;
  updateWidgetTitle: (id: string, title: string) => void;
  deleteWidget: (id: string) => void;
  reorderWidgets: (oldIndex: number, newIndex: number) => void;
  loadWidgetsFromStorage: (widgets: Widget[]) => void;
  // Grid layout actions
  updateWidgetLayout: (widgets: Widget[]) => void;
  updateWidgetHeight: (id: string, height: number) => void;
  
  // Template actions
  loadDashboardFromTemplate: (config: DashboardConfig, widgetsData: Widget[]) => void;
}

const DASHBOARD_CONFIG_KEY = "finboard_dashboard_config";
const WIDGETS_KEY = "finboard_widgets";

// Load initial data from localStorage
const loadDashboardConfig = (): Partial<Pick<DashboardState, "theme" | "layoutMode" | "refreshInterval">> => {
  try {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem(DASHBOARD_CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Error loading dashboard config from localStorage:", error);
  }
  return {};
};

const loadWidgets = (): Widget[] => {
  try {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem(WIDGETS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Error loading widgets from localStorage:", error);
  }
  return [];
};

const savedConfig = loadDashboardConfig();
const savedWidgets = loadWidgets();

export const useStore = create<DashboardState>()(
  persist(
    (set) => ({
      // Initial state
      isAddModalOpen: false,
      editingWidget: null,
      expandedWidget: null,
      theme: (savedConfig.theme as "dark" | "light") || "dark",
      layoutMode: (savedConfig.layoutMode as "grid" | "list") || "grid",
      refreshInterval: savedConfig.refreshInterval || 30,
      widgets: savedWidgets,

      // Dashboard actions
      openAddModal: () =>
        set({
          isAddModalOpen: true,
          editingWidget: null,
        }),

      openEditModal: (widget: Widget) =>
        set({
          isAddModalOpen: true,
          editingWidget: widget,
        }),

      openExpandModal: (widget: Widget) =>
        set({
          expandedWidget: widget,
        }),

      closeModal: () =>
        set({
          isAddModalOpen: false,
          editingWidget: null,
        }),

      closeExpandModal: () =>
        set({
          expandedWidget: null,
        }),

      setTheme: (theme: "dark" | "light") => set({ theme }),

      setLayoutMode: (layoutMode: "grid" | "list") => set({ layoutMode }),

      setGlobalRefreshInterval: (refreshInterval: number) =>
        set({ refreshInterval }),

      // Widget actions
      addWidget: (config: WidgetConfig, id: string) =>
        set((state) => {
          // Calculate y position for new widget (stack at bottom)
          const maxY = state.widgets.reduce((max, w) => {
            const widgetBottom = w.y + w.height;
            return widgetBottom > max ? widgetBottom : max;
          }, 0);

          // Default dimensions based on widget type
          const defaultHeight = 
            config.displayMode === "table" ? 20 : 
            config.displayMode === "chart" ? 15 : 
            10; // card
          const defaultWidth =
            config.displayMode === "table" ? 4 : // Table takes full width
            config.displayMode === "chart" ? 2 :  // Chart takes half width
            2; // Card takes half width

          const newWidget: Widget = {
            id,
            title: config.name,
            type:
              config.displayMode === "card"
                ? WidgetType.CARD
                : config.displayMode === "table"
                ? WidgetType.TABLE
                : WidgetType.CHART,
            apiUrl: config.apiUrl,
            refreshInterval: config.refreshInterval,
            selectedFields: config.selectedFields,
            headers: config.headers,
            x: 0, // Position at start
            y: maxY, // Position at bottom
            w: defaultWidth, // Default width in columns
            height: defaultHeight, // Default height in grid units
            isLoading: true,
          };
          return { widgets: [...state.widgets, newWidget] };
        }),

      updateWidget: (id: string, config: WidgetConfig) =>
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id
              ? {
                  ...widget,
                  title: config.name,
                  type:
                    config.displayMode === "card"
                      ? WidgetType.CARD
                      : config.displayMode === "table"
                      ? WidgetType.TABLE
                      : WidgetType.CHART,
                  apiUrl: config.apiUrl,
                  refreshInterval: config.refreshInterval,
                  selectedFields: config.selectedFields,
                  headers: config.headers,
                  error: undefined,
                }
              : widget
          ),
        })),

      updateWidgetTitle: (id: string, title: string) =>
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, title } : widget
          ),
        })),

      deleteWidget: (id: string) =>
        set((state) => ({
          widgets: state.widgets.filter((widget) => widget.id !== id),
        })),

      reorderWidgets: (oldIndex: number, newIndex: number) =>
        set((state) => {
          const newWidgets = [...state.widgets];
          const [removed] = newWidgets.splice(oldIndex, 1);
          newWidgets.splice(newIndex, 0, removed);
          return { widgets: newWidgets };
        }),

      loadWidgetsFromStorage: (widgets: Widget[]) => set({ widgets }),

      // Grid layout actions
      updateWidgetLayout: (widgets: Widget[]) => 
        set({ widgets }),

      updateWidgetHeight: (id: string, height: number) =>
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, height } : widget
          ),
        })),

      // Template actions
      loadDashboardFromTemplate: (config: DashboardConfig, widgetsData: Widget[]) =>
        set({
          theme: config.theme || "dark",
          layoutMode: config.layoutMode || "grid",
          refreshInterval: config.refreshInterval || 30,
          widgets: widgetsData.map((widget) => ({
            ...widget,
            isLoading: true,
          })),
        }),
    }),
    {
      name: "finboard-storage",
      partialize: (state) => ({
        theme: state.theme,
        layoutMode: state.layoutMode,
        refreshInterval: state.refreshInterval,
        widgets: state.widgets,
      }),
    }
  )
);
