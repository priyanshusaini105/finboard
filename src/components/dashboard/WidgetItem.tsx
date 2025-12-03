"use client";

import React from "react";
import { Widget, WidgetType } from "../../types/widget";
import WidgetCard from "../widgets/WidgetCard";
import WidgetTable from "../widgets/WidgetTable";
import WidgetChart from "../widgets/WidgetChart";
import { GripVertical, Settings, Trash2 } from "lucide-react";

interface WidgetItemProps {
  widget: Widget;
  dragging: boolean;
  editable?: boolean;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function WidgetItem({
  widget,
  dragging,
  editable = true,
  onConfigure,
  onDelete,
}: WidgetItemProps) {
  const renderWidgetContent = () => {
    switch (widget.type) {
      case WidgetType.TABLE:
        return (
          <WidgetTable
            widget={widget}
            onConfigure={onConfigure}
            onDelete={onDelete}
          />
        );
      case WidgetType.CHART:
        return (
          <WidgetChart
            widget={widget}
            onConfigure={onConfigure}
            onDelete={onDelete}
          />
        );
      default:
        return (
          <WidgetCard
            widget={widget}
            onConfigure={onConfigure}
            onDelete={onDelete}
          />
        );
    }
  };

  return (
    <div
      className={`widget-item-container h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-shadow ${
        dragging ? "shadow-2xl ring-2 ring-emerald-400 opacity-90" : "hover:shadow-md"
      }`}
    >
      {/* Draggable Header */}
      <div
        className={`widget-drag-handle flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 ${
          editable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        } ${dragging ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
      >
        {/* Left: Drag Icon + Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {editable && (
            <div
              className={`widget-drag-icon shrink-0 transition-opacity ${
                dragging ? "opacity-100" : "opacity-40 hover:opacity-100"
              }`}
            >
              <GripVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
          )}
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
            {widget.title}
          </h3>
        </div>

        {/* Right: Action Buttons */}
        {editable && (
          <div className="widget-drag-cancel flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfigure(widget.id);
              }}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Configure Widget"
            >
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this widget?")) {
                  onDelete(widget.id);
                }
              }}
              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title="Delete Widget"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Widget Body */}
      <div className="widget-body flex-1 overflow-auto">
        {renderWidgetContent()}
      </div>

      <style jsx>{`
        .widget-item-container {
          position: relative;
          user-select: none;
        }

        /* Prevent text selection during drag */
        .widget-item-container.dragging {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        /* Header styles */
        .widget-drag-handle {
          user-select: none;
        }

        .widget-drag-handle.cursor-grab:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
}
