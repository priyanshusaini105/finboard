"use client";

import { Plus } from "lucide-react";

interface AddWidgetCardProps {
  onClick: () => void;
}

export default function AddWidgetCard({ onClick }: AddWidgetCardProps) {
  return (
    <div
      onClick={onClick}
      className="border-2 border-dashed border-emerald-500/35 dark:border-emerald-500/25 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/65 dark:hover:border-emerald-500/45 transition-all duration-300 bg-emerald-50 dark:bg-slate-800/30 hover:bg-emerald-100 dark:hover:bg-slate-800/50 group"
    >
      <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md group-hover:shadow-lg group-hover:shadow-emerald-500/25 dark:group-hover:shadow-emerald-500/15">
        <Plus className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Add Widget</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-xs">
        Connect to a finance API and create a custom widget
      </p>
    </div>
  );
}
