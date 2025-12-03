"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Widget, WidgetType } from "../../types/widget";
import WidgetCard from "../widgets/WidgetCard";
import WidgetTable from "../widgets/WidgetTable";
import WidgetChart from "../widgets/WidgetChart";

interface SortableWidgetProps {
  widget: Widget;
  onRefresh: (widgetId: string) => void;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function SortableWidget({
  widget,
  onRefresh,
  onConfigure,
  onDelete,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  const renderWidget = () => {
    switch (widget.type) {
      case WidgetType.TABLE:
        return (
          <WidgetTable
            widget={widget}
            onRefresh={onRefresh}
            onConfigure={onConfigure}
            onDelete={onDelete}
          />
        );
      case WidgetType.CHART:
        return (
          <WidgetChart
            widget={widget}
            onRefresh={onRefresh}
            onConfigure={onConfigure}
            onDelete={onDelete}
          />
        );
      default:
        return (
          <WidgetCard
            widget={widget}
            onRefresh={onRefresh}
            onConfigure={onConfigure}
            onDelete={onDelete}
          />
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`transition-all duration-200 ${
        isDragging
          ? "z-50 shadow-2xl scale-105 rotate-3 ring-2 ring-blue-500 ring-opacity-50"
          : "hover:shadow-lg hover:scale-102"
      }`}
    >
      <div className={`relative ${isDragging ? "pointer-events-none" : ""}`}>
        {/* Drag handle indicator */}
        <div
          className={`absolute top-2 left-2 z-10 transition-opacity ${
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
    </div>
  );
}
