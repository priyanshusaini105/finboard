import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Widget, WidgetConfig, WidgetType } from "@/src/types";
import { ChartDataPoint } from "@/src/utils";
import {
  encryptHeaderValues,
  encryptUrlParams,
  removeEncryptedSecret,
} from "@/src/utils/encryptionMiddleware";

interface DashboardConfig {
  theme?: "dark" | "light";
  layoutMode?: "grid" | "list";
  refreshInterval?: number;
}

export interface RealtimeWidgetState {
  isRealtimeEnabled: boolean;
  isConnected: boolean;
  lastUpdateTime: number | null;
  realtimeData: ChartDataPoint[];
  provider: string;
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
  
  // Realtime state per widget
  realtimeStates: Record<string, RealtimeWidgetState>;
  
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
  addWidget: (config: WidgetConfig, id: string) => Promise<void>;
  updateWidget: (id: string, config: WidgetConfig) => Promise<void>;
  updateWidgetTitle: (id: string, title: string) => void;
  deleteWidget: (id: string) => void;
  reorderWidgets: (oldIndex: number, newIndex: number) => void;
  loadWidgetsFromStorage: (widgets: Widget[]) => void;
  // Grid layout actions
  updateWidgetLayout: (widgets: Widget[]) => void;
  updateWidgetHeight: (id: string, height: number) => void;
  
  // Template actions
  loadDashboardFromTemplate: (config: DashboardConfig, widgetsData: Widget[]) => Promise<void>;

  // Realtime actions
  initRealtimeWidget: (widgetId: string, provider: string) => void;
  setRealtimeConnected: (widgetId: string, connected: boolean) => void;
  updateRealtimeData: (widgetId: string, data: ChartDataPoint[]) => void;
  setRealtimeEnabled: (widgetId: string, enabled: boolean) => void;
  clearRealtimeState: (widgetId: string) => void;
}

export const useStore = create<DashboardState>()(
  persist(
    (set) => ({
      // Initial state
      isAddModalOpen: false,
      editingWidget: null,
      expandedWidget: null,
      theme: "dark",
      layoutMode: "grid",
      refreshInterval: 30,
      widgets: [],
      realtimeStates: {},

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
      addWidget: async (config: WidgetConfig, id: string) => {
        // Encrypt sensitive values in headers and URL
        const encryptedHeaders = config.headers 
          ? await encryptHeaderValues(config.headers)
          : {};
        
        const encryptedApiUrl = config.apiUrl
          ? await encryptUrlParams(config.apiUrl)
          : undefined;

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
            apiUrl: encryptedApiUrl, // Encrypted URL params
            refreshInterval: config.refreshInterval,
            selectedFields: config.selectedFields,
            headers: encryptedHeaders, // Encrypted header values
            x: 0, // Position at start
            y: maxY, // Position at bottom
            w: defaultWidth, // Default width in columns
            height: defaultHeight, // Default height in grid units
            isLoading: true,
            enableRealtime: config.enableRealtime || false,
            realtimeProvider: config.realtimeProvider,
            realtimeSymbol: config.realtimeSymbol,
            websocketUrl: config.websocketUrl,
            websocketSymbols: config.websocketSymbols,
          };
          return { widgets: [...state.widgets, newWidget] };
        });
      },

      updateWidget: async (id: string, config: WidgetConfig) => {
        // Encrypt sensitive values in headers and URL
        const encryptedHeaders = config.headers 
          ? await encryptHeaderValues(config.headers)
          : {};
        
        const encryptedApiUrl = config.apiUrl
          ? await encryptUrlParams(config.apiUrl)
          : undefined;

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
                  apiUrl: encryptedApiUrl,
                  refreshInterval: config.refreshInterval,
                  selectedFields: config.selectedFields,
                  headers: encryptedHeaders,
                  error: undefined,
                  enableRealtime: config.enableRealtime || false,
                  realtimeProvider: config.realtimeProvider,
                  realtimeSymbol: config.realtimeSymbol,
                  websocketUrl: config.websocketUrl,
                  websocketSymbols: config.websocketSymbols,
                }
              : widget
          ),
        }));
      },

      updateWidgetTitle: (id: string, title: string) =>
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, title } : widget
          ),
        })),

      deleteWidget: (id: string) =>
        set((state) => {
          // Clean up encrypted secrets for this widget
          removeEncryptedSecret(id);
          
          return {
            widgets: state.widgets.filter((widget) => widget.id !== id),
            realtimeStates: Object.fromEntries(
              Object.entries(state.realtimeStates).filter(([key]) => key !== id)
            ),
          };
        }),

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
      loadDashboardFromTemplate: async (config: DashboardConfig, widgetsData: Widget[]) => {
        // Encrypt all widgets' sensitive data
        const encryptedWidgets = await Promise.all(
          widgetsData.map(async (widget) => {
            // Encrypt headers
            const encryptedHeaders = widget.headers
              ? await encryptHeaderValues(widget.headers)
              : {};
            
            // Encrypt URL params
            const encryptedApiUrl = widget.apiUrl
              ? await encryptUrlParams(widget.apiUrl)
              : widget.apiUrl;
            
            return {
              ...widget,
              headers: encryptedHeaders,
              apiUrl: encryptedApiUrl,
              isLoading: true,
            };
          })
        );
        
        set({
          theme: config.theme || "dark",
          layoutMode: config.layoutMode || "grid",
          refreshInterval: config.refreshInterval || 30,
          widgets: encryptedWidgets,
        });
      },

      // Realtime actions
      initRealtimeWidget: (widgetId: string, provider: string) =>
        set((state) => ({
          realtimeStates: {
            ...state.realtimeStates,
            [widgetId]: {
              isRealtimeEnabled: true,
              isConnected: false,
              lastUpdateTime: null,
              realtimeData: [],
              provider,
            },
          },
        })),

      setRealtimeConnected: (widgetId: string, connected: boolean) =>
        set((state) => ({
          realtimeStates: {
            ...state.realtimeStates,
            [widgetId]: {
              ...state.realtimeStates[widgetId],
              isConnected: connected,
              lastUpdateTime: connected ? Date.now() : state.realtimeStates[widgetId]?.lastUpdateTime || null,
            },
          },
        })),

      updateRealtimeData: (widgetId: string, data: ChartDataPoint[]) =>
        set((state) => ({
          realtimeStates: {
            ...state.realtimeStates,
            [widgetId]: {
              ...state.realtimeStates[widgetId],
              realtimeData: data,
              lastUpdateTime: Date.now(),
            },
          },
        })),

      setRealtimeEnabled: (widgetId: string, enabled: boolean) =>
        set((state) => ({
          realtimeStates: {
            ...state.realtimeStates,
            [widgetId]: {
              ...state.realtimeStates[widgetId],
              isRealtimeEnabled: enabled,
            },
          },
        })),

      clearRealtimeState: (widgetId: string) =>
        set((state) => {
          const newRealtimeStates = { ...state.realtimeStates };
          delete newRealtimeStates[widgetId];
          return { realtimeStates: newRealtimeStates };
        }),
    }),
    {
      name: "finboard-v1-dashboard-storage",
      partialize: (state) => ({
        theme: state.theme,
        layoutMode: state.layoutMode,
        refreshInterval: state.refreshInterval,
        // Store widgets with encrypted sensitive values in-place
        widgets: state.widgets,
      }),
    }
  )
);
