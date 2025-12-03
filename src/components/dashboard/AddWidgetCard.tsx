"use client";

import { Plus } from "lucide-react";

interface AddWidgetCardProps {
  onClick: () => void;
}

export default function AddWidgetCard({ onClick }: AddWidgetCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all duration-200 flex flex-col items-center justify-center min-h-64"
    >
      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-3">
        <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        Add Widget
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
        Click to create a new widget
      </p>
    </button>
  );
}
