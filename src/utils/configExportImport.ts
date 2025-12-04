import { Widget } from "@/src/types";

export interface DashboardBackup {
  version: string;
  exportedAt: string;
  config: {
    theme: "dark" | "light";
    layoutMode: "grid" | "list";
    refreshInterval: number;
  };
  widgets: Widget[];
}

/**
 * Export dashboard configuration and widgets to a JSON file
 */
export const exportDashboardConfig = (
  widgets: Widget[],
  theme: "dark" | "light",
  layoutMode: "grid" | "list",
  refreshInterval: number
): void => {
  const backup: DashboardBackup = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    config: {
      theme,
      layoutMode,
      refreshInterval,
    },
    widgets,
  };

  // Convert to JSON and create blob
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Create download link and trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = `dashboard-config-${new Date().getTime()}.json`;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import dashboard configuration from a JSON file
 */
export const importDashboardConfig = (
  file: File
): Promise<DashboardBackup> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const backup: DashboardBackup = JSON.parse(content);

        // Validate backup structure
        if (
          !backup.version ||
          !backup.config ||
          !Array.isArray(backup.widgets)
        ) {
          reject(
            new Error(
              "Invalid backup file format. Please ensure you are importing a valid dashboard configuration."
            )
          );
          return;
        }

        resolve(backup);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse backup file: ${error instanceof Error ? error.message : "Unknown error"}`
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
};
