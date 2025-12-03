"use client";

import { useEffect, useState } from "react";
import { Widget, WidgetType } from "../../types/widget";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import DashboardHeader from "./DashboardHeader";
import AddWidgetCard from "./AddWidgetCard";
import SortableWidget from "./SortableWidget";

export default function Dashboard() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize with dummy widgets
  useEffect(() => {
    const initialWidgets: Widget[] = [
      {
        id: "widget-1",
        title: "Stock Price",
        type: WidgetType.CARD,
        refreshInterval: 30,
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
      },
      {
        id: "widget-2",
        title: "Market Trending",
        type: WidgetType.TABLE,
        refreshInterval: 30,
        position: { x: 0, y: 1 },
        size: { width: 3, height: 2 },
      },
      {
        id: "widget-3",
        title: "RELIANCE Stock Chart",
        type: WidgetType.CHART,
        refreshInterval: 30,
        position: { x: 0, y: 3 },
        size: { width: 2, height: 2 },
      },
      {
        id: "widget-4",
        title: "Crypto Value",
        type: WidgetType.CARD,
        refreshInterval: 30,
        position: { x: 1, y: 0 },
        size: { width: 1, height: 1 },
      },
      {
        id: "widget-5",
        title: "Market Index",
        type: WidgetType.CARD,
        refreshInterval: 30,
        position: { x: 2, y: 0 },
        size: { width: 1, height: 1 },
      },
    ];
    setWidgets(initialWidgets);
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addWidgetHandler = () => {
    const newWidget: Widget = {
      id: generateId(),
      title: `Widget ${widgets.length + 1}`,
      type: [WidgetType.CARD, WidgetType.TABLE, WidgetType.CHART][
        Math.floor(Math.random() * 3)
      ],
      refreshInterval: 30,
      position: { x: 0, y: widgets.length },
      size: { width: 1, height: 1 },
    };
    setWidgets([...widgets, newWidget]);
    setIsAddModalOpen(false);
  };

  const deleteWidgetHandler = (widgetId: string) => {
    setWidgets(widgets.filter((w) => w.id !== widgetId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex((item) => item.id === active.id);
      const newIndex = widgets.findIndex((item) => item.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newWidgets = [...widgets];
        [newWidgets[oldIndex], newWidgets[newIndex]] = [
          newWidgets[newIndex],
          newWidgets[oldIndex],
        ];
        setWidgets(newWidgets);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <DashboardHeader
        onAddWidget={() => setIsAddModalOpen(true)}
        widgetCount={widgets.length}
      />

      <main className="p-6">
        {widgets.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Build Your Finance Dashboard
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                Create custom widgets to track stocks, crypto, market data - in
                real-time.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Add Your First Widget
              </button>
            </div>
          </div>
        ) : (
          // Widgets with drag and drop
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              {/* Full width table widgets */}
              <SortableContext
                items={widgets
                  .filter((w) => w.type === WidgetType.TABLE)
                  .map((w) => w.id)}
                strategy={rectSortingStrategy}
              >
                <div className="space-y-6">
                  {widgets
                    .filter((w) => w.type === WidgetType.TABLE)
                    .map((widget) => (
                      <SortableWidget
                        key={widget.id}
                        widget={widget}
                        onRefresh={() => {}}
                        onConfigure={() => {}}
                        onDelete={deleteWidgetHandler}
                      />
                    ))}
                </div>
              </SortableContext>

              {/* Regular grid for cards and charts */}
              <SortableContext
                items={widgets
                  .filter((w) => w.type !== WidgetType.TABLE)
                  .map((w) => w.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {widgets
                    .filter((w) => w.type !== WidgetType.TABLE)
                    .map((widget) => (
                      <SortableWidget
                        key={widget.id}
                        widget={widget}
                        onRefresh={() => {}}
                        onConfigure={() => {}}
                        onDelete={deleteWidgetHandler}
                      />
                    ))}

                  {/* Add Widget Card */}
                  <AddWidgetCard onClick={() => setIsAddModalOpen(true)} />
                </div>
              </SortableContext>
            </div>
          </DndContext>
        )}
      </main>
    </div>
  );
}
