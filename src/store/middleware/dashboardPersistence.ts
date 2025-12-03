import { Middleware } from "@reduxjs/toolkit";
import { RootState } from "../index";

const DASHBOARD_CONFIG_KEY = "finboard_dashboard_config";
const WIDGETS_KEY = "finboard_widgets";

interface DashboardConfig {
  theme: "dark" | "light";
  layoutMode: "grid" | "list";
  refreshInterval: number;
}

/**
 * Middleware that persists dashboard config and widgets to localStorage after every action
 */
export const dashboardPersistenceMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);

  // Persist dashboard state and widgets after every action
  try {
    if (typeof window !== "undefined") {
      const state = store?.getState?.();
      if (state) {
        // Persist dashboard config
        if (state.dashboard) {
          const configToSave: DashboardConfig = {
            theme: state.dashboard.theme,
            layoutMode: state.dashboard.layoutMode,
            refreshInterval: state.dashboard.refreshInterval,
          };
          window.localStorage.setItem(
            DASHBOARD_CONFIG_KEY,
            JSON.stringify(configToSave)
          );
        }

        // Persist widgets
        if (state.widgets?.items) {
          window.localStorage.setItem(
            WIDGETS_KEY,
            JSON.stringify(state.widgets.items)
          );
        }
      }
    }
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }

  return result;
};

/**
 * Load dashboard config from localStorage
 */
export function loadDashboardConfig(): Partial<DashboardConfig> {
  try {
    if (typeof window === "undefined") {
      return {};
    }

    const saved = window.localStorage.getItem(DASHBOARD_CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Error loading dashboard config from localStorage:", error);
  }
  return {};
}

/**
 * Load widgets from localStorage
 */
export function loadWidgets() {
  try {
    if (typeof window === "undefined") {
      return [];
    }

    const saved = window.localStorage.getItem(WIDGETS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Error loading widgets from localStorage:", error);
  }
  return [];
}

// Store reference for middleware
let store: { getState?: () => RootState } | null = null;

export function setStoreReference(storeInstance: { getState?: () => RootState }) {
  store = storeInstance;
}
