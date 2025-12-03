import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Widget } from "../../types/widget";

interface DashboardState {
  isAddModalOpen: boolean;
  editingWidget: Widget | null;
  theme: "dark" | "light";
  layoutMode: "grid" | "list";
  refreshInterval: number; // Global refresh interval
}

const initialState: DashboardState = {
  isAddModalOpen: false,
  editingWidget: null,
  theme: "dark",
  layoutMode: "grid",
  refreshInterval: 30, // 30 seconds default
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    openAddModal: (state) => {
      state.isAddModalOpen = true;
      state.editingWidget = null;
    },

    openEditModal: (state, action: PayloadAction<Widget>) => {
      state.isAddModalOpen = true;
      state.editingWidget = action.payload;
    },

    closeModal: (state) => {
      state.isAddModalOpen = false;
      state.editingWidget = null;
    },

    setTheme: (state, action: PayloadAction<"dark" | "light">) => {
      state.theme = action.payload;
    },

    setLayoutMode: (state, action: PayloadAction<"grid" | "list">) => {
      state.layoutMode = action.payload;
    },

    setGlobalRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
  },
});

export const {
  openAddModal,
  openEditModal,
  closeModal,
  setTheme,
  setLayoutMode,
  setGlobalRefreshInterval,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
