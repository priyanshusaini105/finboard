import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Widget, WidgetType, WidgetConfig } from "../../types/widget";

interface WidgetsState {
  items: Widget[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WidgetsState = {
  items: [],
  isLoading: false,
  error: null,
};

const widgetsSlice = createSlice({
  name: "widgets",
  initialState,
  reducers: {
    addWidget: (
      state,
      action: PayloadAction<{ config: WidgetConfig; id: string }>
    ) => {
      const { config, id } = action.payload;
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
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        isLoading: true, // Start with loading state
      };
      state.items.push(newWidget);
    },

    updateWidget: (
      state,
      action: PayloadAction<{ id: string; config: WidgetConfig }>
    ) => {
      const { id, config } = action.payload;
      const widget = state.items.find((w) => w.id === id);
      if (widget) {
        widget.title = config.name;
        widget.type =
          config.displayMode === "card"
            ? WidgetType.CARD
            : config.displayMode === "table"
            ? WidgetType.TABLE
            : WidgetType.CHART;
        widget.apiUrl = config.apiUrl;
        widget.refreshInterval = config.refreshInterval;
        widget.selectedFields = config.selectedFields;
        widget.headers = config.headers;
        widget.error = undefined; // Clear any previous errors
      }
    },

    deleteWidget: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((w) => w.id !== action.payload);
    },

    reorderWidgets: (
      state,
      action: PayloadAction<{ oldIndex: number; newIndex: number }>
    ) => {
      const { oldIndex, newIndex } = action.payload;
      const [removed] = state.items.splice(oldIndex, 1);
      state.items.splice(newIndex, 0, removed);
    },

    loadWidgetsFromStorage: (state, action: PayloadAction<Widget[]>) => {
      state.items = action.payload;
    },
  },
});

export const {
  addWidget,
  updateWidget,
  deleteWidget,
  reorderWidgets,
  loadWidgetsFromStorage,
} = widgetsSlice.actions;

export default widgetsSlice.reducer;
