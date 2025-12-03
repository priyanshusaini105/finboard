"use client";

import { Plus } from "lucide-react";

interface AddWidgetCardProps {
  onClick: () => void;
}

export default function AddWidgetCard({ onClick }: AddWidgetCardProps) {
  return (
    <div
      onClick={onClick}
      className="border-2 border-dashed border-emerald-500/30 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-colors bg-slate-800/50"
    >
      <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
        <Plus className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Add Widget</h3>
      <p className="text-sm text-slate-400 text-center max-w-xs">
        Connect to a finance API and create a custom widget
      </p>
    </div>
  );
}
