import { useEffect } from "react";
import { useStore } from "../store/useStore";

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
  const {
    theme,
    layoutMode,
    refreshInterval,
    setTheme,
    setLayoutMode,
    setGlobalRefreshInterval,
  } = useStore();

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const savedConfig = window.localStorage.getItem(DASHBOARD_CONFIG_KEY);
      if (savedConfig) {
        const config: DashboardConfig = JSON.parse(savedConfig);
        if (config.theme) setTheme(config.theme);
        if (config.layoutMode) setLayoutMode(config.layoutMode);
        if (config.refreshInterval)
          setGlobalRefreshInterval(config.refreshInterval);
      }
    } catch (error) {
      console.error("Error loading dashboard config from localStorage:", error);
    }
  }, [setTheme, setLayoutMode, setGlobalRefreshInterval]);

  // Save configuration to localStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const configToSave: DashboardConfig = {
        theme,
        layoutMode,
        refreshInterval,
      };

      window.localStorage.setItem(
        DASHBOARD_CONFIG_KEY,
        JSON.stringify(configToSave)
      );
    } catch (error) {
      console.error("Error saving dashboard config to localStorage:", error);
    }
  }, [theme, layoutMode, refreshInterval]);
}
