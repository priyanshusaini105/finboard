"use client";

import { Plus, BarChart3 } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import { useTheme } from "../../contexts/ThemeContext";

interface DashboardHeaderProps {
  onAddWidget: () => void;
  widgetCount: number;
}

export default function DashboardHeader({
  onAddWidget,
  widgetCount,
}: DashboardHeaderProps) {
  const { theme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 theme-transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Finance Dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {widgetCount} active widget{widgetCount !== 1 ? "s" : ""} •
              Real-time data • Theme: {theme}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <button
            onClick={onAddWidget}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Widget</span>
          </button>
        </div>
      </div>
    </header>
  );
}
