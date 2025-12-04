"use client";

import { memo } from "react";
import { Widget, WidgetType } from "@/src/types";
import { WidgetCard, WidgetTable, WidgetChart } from "@/src/components/widgets";

interface SortableWidgetContentProps {
  widget: Widget;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
  isDragging: boolean;
}

// Memoized content component to prevent re-renders during drag
const SortableWidgetContent = memo(
  ({
    widget,
    onConfigure,
    onDelete,
    isDragging,
  }: SortableWidgetContentProps) => {
    const renderWidget = () => {
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
      <div className={`relative ${isDragging ? "pointer-events-none" : ""}`}>
        {/* Drag handle indicator */}
        <div
          className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-60"
          }`}
        >
          <div className="bg-slate-600 rounded p-1">
            <svg
              className="w-3 h-3 text-slate-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 3H11V5H9V3ZM13 3H15V5H13V3ZM9 7H11V9H9V7ZM13 7H15V9H13V7ZM9 11H11V13H9V11ZM13 11H15V13H13V11ZM9 15H11V17H9V15ZM13 15H15V17H13V15ZM9 19H11V21H9V19ZM13 19H15V21H13V19Z" />
            </svg>
          </div>
        </div>
        {renderWidget()}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if widget data changes or isDragging changes
    return (
      prevProps.widget === nextProps.widget &&
      prevProps.isDragging === nextProps.isDragging
    );
  }
);

SortableWidgetContent.displayName = "SortableWidgetContent";

export default SortableWidgetContent;
