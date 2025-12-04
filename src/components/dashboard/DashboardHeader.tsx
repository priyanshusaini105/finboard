"use client";

import { Plus, BarChart3, Download, Upload, RotateCcw, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { ThemeToggle } from "@/src/components/ui";
import { useTheme } from "@/src/contexts";
import { useStore } from "@/src/store";
import { TemplatesModal } from ".";
import {
  exportDashboardConfig,
  importDashboardConfig,
} from "@/src/utils";

interface DashboardHeaderProps {
  onAddWidget: () => void;
  widgetCount: number;
}

export default function DashboardHeader({
  onAddWidget,
  widgetCount,
}: DashboardHeaderProps) {
  const { theme } = useTheme();
  const {
    setTheme,
    setLayoutMode,
    setGlobalRefreshInterval,
    loadWidgetsFromStorage,
  } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleExport = () => {
    const state = useStore.getState();
    exportDashboardConfig(
      state.widgets,
      state.theme,
      state.layoutMode,
      state.refreshInterval
    );
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    try {
      const backup = await importDashboardConfig(file);

      // Apply configuration
      setTheme(backup.config.theme);
      setLayoutMode(backup.config.layoutMode);
      setGlobalRefreshInterval(backup.config.refreshInterval);
      loadWidgetsFromStorage(backup.widgets);

      setImportSuccess(
        `Configuration imported successfully! ${backup.widgets.length} widget(s) restored.`
      );

      // Clear success message after 3 seconds
      setTimeout(() => setImportSuccess(null), 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to import configuration";
      setImportError(errorMessage);

      // Clear error message after 5 seconds
      setTimeout(() => setImportError(null), 5000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    // Reset to default state
    setTheme("dark");
    setLayoutMode("grid");
    setGlobalRefreshInterval(30);
    loadWidgetsFromStorage([]);

    setImportSuccess("Dashboard reset to default configuration.");
    setTimeout(() => setImportSuccess(null), 3000);
    setShowResetConfirm(false);
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 theme-transition">
      {/* Status messages */}
      {importError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {importError}
        </div>
      )}
      {importSuccess && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {importSuccess}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap">
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white truncate">
              Finance Dashboard
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">
              {widgetCount} widget{widgetCount !== 1 ? "s" : ""} • {theme}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-end w-full md:w-auto">
          {/* Add Widget Button */}
          <button
            onClick={onAddWidget}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-colors text-sm md:text-base whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Widget</span>
          </button>

          {/* Templates Button */}
          <button
            onClick={() => setShowTemplates(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-colors text-sm md:text-base whitespace-nowrap"
            title="Load pre-built dashboard templates"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden xs:inline">Templates</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="bg-slate-600 hover:bg-slate-700 text-white p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-colors"
            title="Export dashboard configuration"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Export</span>
          </button>

          {/* Import Button */}
          <button
            onClick={handleImportClick}
            className="bg-slate-600 hover:bg-slate-700 text-white p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-colors"
            title="Import dashboard configuration"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Import</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-slate-600 hover:bg-slate-700 text-white p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-colors"
            title="Reset dashboard to default configuration"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Reset</span>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Import dashboard configuration file"
          />
          <ThemeToggle />
        </div>
      </div>

      {/* Templates Modal */}
      <TemplatesModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} />

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Reset Dashboard?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This will remove all widgets and reset configuration to default
              settings. This action cannot be undone.
            </p>
            <div className="border-t border-slate-200 dark:border-slate-700 mb-6"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
