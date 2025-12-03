"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import { Widget } from "../../types/widget";
import WidgetItem from "./WidgetItem";

interface WidgetGridProps {
  widgets: Widget[];
  onLayoutChange: (widgets: Widget[]) => void;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
  editable?: boolean;
}

const ResponsiveGridLayout = WidthProvider(Responsive);

// Grid configuration inspired by Apitable with multi-column support
const GRID_CONFIG = {
  rowHeight: 16, // 16px per grid unit
  minHeight: 6.2, // Minimum widget height (~99px)
  minWidth: 1, // Minimum widget width (1 column)
  cols: { lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }, // Multi-column responsive layout
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  margin: [16, 24] as [number, number], // [vertical, horizontal] margin
};

export default function WidgetGrid({
  widgets,
  onLayoutChange,
  onConfigure,
  onDelete,
  editable = true,
}: WidgetGridProps) {
  const [dragging, setDragging] = useState(false);

  // Convert widgets to react-grid-layout format
  const layouts = useMemo<Layouts>(() => {
    const layoutItems: Layout[] = widgets.map((widget, index) => ({
      i: widget.id,
      x: widget.x ?? (index % GRID_CONFIG.cols.lg),
      y: widget.y ?? Math.floor(index / GRID_CONFIG.cols.lg) * 10,
      w: widget.w ?? 2, // Default to 2 columns
      h: widget.height ?? 10, // Default height if not set
      minH: GRID_CONFIG.minHeight,
      minW: GRID_CONFIG.minWidth,
      static: !editable,
    }));

    return {
      lg: layoutItems,
      md: layoutItems.map(item => ({
        ...item,
        x: item.x ? Math.min(item.x, GRID_CONFIG.cols.md - 1) : 0,
        w: Math.min(item.w, GRID_CONFIG.cols.md),
      })),
      sm: layoutItems.map(item => ({
        ...item,
        x: item.x ? Math.min(item.x, GRID_CONFIG.cols.sm - 1) : 0,
        w: Math.min(item.w, GRID_CONFIG.cols.sm),
      })),
      xs: layoutItems.map(item => ({
        ...item,
        x: 0,
        w: 1,
      })),
      xxs: layoutItems.map(item => ({
        ...item,
        x: 0,
        w: 1,
      })),
    };
  }, [widgets, editable]);

  // Handle drag stop - save new positions
  const handleDragStop = useCallback(
    (layout: Layout[]) => {
      setDragging(false);

      // Extract new positions and update widgets
      const updatedWidgets = widgets.map((widget) => {
        const layoutItem = layout.find((l) => l.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            height: layoutItem.h,
          };
        }
        return widget;
      });

      onLayoutChange(updatedWidgets);
    },
    [widgets, onLayoutChange]
  );

  // Handle resize stop - save new dimensions
  const handleResizeStop = useCallback(
    (layout: Layout[], oldItem: Layout, newItem: Layout) => {
      setDragging(false);

      // Update the widget with new dimensions
      const updatedWidgets = widgets.map((widget) =>
        widget.id === newItem.i
          ? {
              ...widget,
              x: newItem.x,
              y: newItem.y,
              w: newItem.w,
              height: newItem.h,
            }
          : widget
      );

      onLayoutChange(updatedWidgets);
    },
    [widgets, onLayoutChange]
  );

  return (
    <div className="widget-grid-container">
      <ResponsiveGridLayout
        className="widget-grid-layout"
        layouts={layouts}
        cols={GRID_CONFIG.cols}
        breakpoints={GRID_CONFIG.breakpoints}
        rowHeight={GRID_CONFIG.rowHeight}
        margin={GRID_CONFIG.margin}
        containerPadding={[0, 0]}
        isDraggable={editable}
        isResizable={editable}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".widget-drag-cancel"
        onDrag={() => setDragging(true)}
        onDragStart={() => setDragging(true)}
        onDragStop={handleDragStop}
        onResizeStart={() => setDragging(true)}
        onResizeStop={handleResizeStop}
      >
        {widgets.map((widget, index) => (
          <div 
            key={widget.id} 
            data-grid={{
              i: widget.id,
              x: widget.x ?? (index % GRID_CONFIG.cols.lg),
              y: widget.y ?? Math.floor(index / GRID_CONFIG.cols.lg) * 10,
              w: widget.w ?? 2,
              h: widget.height ?? 10,
              minH: GRID_CONFIG.minHeight,
              minW: GRID_CONFIG.minWidth,
            }}
          >
            <WidgetItem
              widget={widget}
              dragging={dragging}
              editable={editable}
              onConfigure={onConfigure}
              onDelete={onDelete}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      <style jsx>{`
        .widget-grid-container {
          width: 100%;
          position: relative;
        }

        :global(.widget-grid-layout) {
          background: transparent;
          transition: none;
        }

        /* Remove transitions during drag for smooth performance */
        :global(.widget-grid-layout *) {
          transition: none !important;
        }

        /* Grid item styles */
        :global(.react-grid-item) {
          transition: none;
          border: none;
          background: transparent;
        }

        /* Placeholder styles during drag */
        :global(.react-grid-placeholder) {
          background: rgba(16, 185, 129, 0.15);
          border-radius: 8px;
          opacity: 1;
          z-index: 0;
          border: 2px dashed rgba(16, 185, 129, 0.4);
        }

        /* Resize handle styles */
        :global(.react-resizable-handle) {
          background-image: none;
          background-color: transparent;
        }

        :global(.react-resizable-handle-se) {
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }

        /* Show resize indicator on hover */
        :global(.react-resizable-handle-se::after) {
          content: "";
          position: absolute;
          width: 12px;
          height: 12px;
          right: 4px;
          bottom: 4px;
          border-right: 2px solid rgba(100, 116, 139, 0.5);
          border-bottom: 2px solid rgba(100, 116, 139, 0.5);
        }

        :global(.react-grid-item:hover .react-resizable-handle-se::after) {
          border-right-color: rgba(16, 185, 129, 0.8);
          border-bottom-color: rgba(16, 185, 129, 0.8);
        }
      `}</style>
    </div>
  );
}
