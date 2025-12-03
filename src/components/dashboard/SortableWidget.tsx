"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Widget } from "../../types/widget";
import SortableWidgetContent from "./SortableWidgetContent";

interface SortableWidgetProps {
  widget: Widget;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function SortableWidget({
  widget,
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
  } = useSortable({ 
    id: widget.id,
    transition: {
      duration: 250,
      easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    willChange: isDragging ? "transform" : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${
        isDragging
          ? "z-50 shadow-2xl ring-2 ring-emerald-400 ring-opacity-60 rounded-lg" 
          : ""
      }`}
    >
      <SortableWidgetContent
        widget={widget}
        onConfigure={onConfigure}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
}
