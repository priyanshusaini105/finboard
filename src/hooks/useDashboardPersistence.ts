import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import {
  setTheme,
  setLayoutMode,
  setGlobalRefreshInterval,
} from "../store/slices/dashboardSlice";

const DASHBOARD_CONFIG_KEY = "finboard_dashboard_config";

interface DashboardConfig {
  theme: "dark" | "light";
  layoutMode: "grid" | "list";
  refreshInterval: number;
}

/**
 * Hook to persist and restore dashboard configuration from localStorage
 * Call this hook in a component that wraps your dashboard
 */
export function useDashboardPersistence() {
  const dispatch = useDispatch<AppDispatch>();
  const dashboardState = useSelector((state: RootState) => state.dashboard);

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const savedConfig = window.localStorage.getItem(DASHBOARD_CONFIG_KEY);
      if (savedConfig) {
        const config: DashboardConfig = JSON.parse(savedConfig);
        if (config.theme) dispatch(setTheme(config.theme));
        if (config.layoutMode) dispatch(setLayoutMode(config.layoutMode));
        if (config.refreshInterval)
          dispatch(setGlobalRefreshInterval(config.refreshInterval));
      }
    } catch (error) {
      console.error("Error loading dashboard config from localStorage:", error);
    }
  }, [dispatch]);

  // Save configuration to localStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const configToSave: DashboardConfig = {
        theme: dashboardState.theme,
        layoutMode: dashboardState.layoutMode,
        refreshInterval: dashboardState.refreshInterval,
      };

      window.localStorage.setItem(
        DASHBOARD_CONFIG_KEY,
        JSON.stringify(configToSave)
      );
    } catch (error) {
      console.error("Error saving dashboard config to localStorage:", error);
    }
  }, [
    dashboardState.theme,
    dashboardState.layoutMode,
    dashboardState.refreshInterval,
  ]);
}
