"use client";

import { useEffect } from "react";
import { Widget, WidgetType, WidgetConfig } from "../../types/widget";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

import {
  addWidget,
  updateWidget,
  deleteWidget,
  reorderWidgets,
  loadWidgetsFromStorage,
} from "../../store/slices/widgetsSlice";
import {
  openAddModal,
  openEditModal,
  closeModal,
} from "../../store/slices/dashboardSlice";
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
import AddWidgetModal from "./AddWidgetModal";
import AddWidgetCard from "./AddWidgetCard";
import SortableWidget from "./SortableWidget";

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const widgets = useAppSelector((state) => state.widgets.items);
  const { isAddModalOpen, editingWidget } = useAppSelector(
    (state) => state.dashboard
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load widgets from localStorage on mount
  useEffect(() => {
    const savedWidgets = localStorage.getItem("dashboard-widgets");
    if (savedWidgets) {
      try {
        const parsedWidgets = JSON.parse(savedWidgets);
        dispatch(loadWidgetsFromStorage(parsedWidgets));
      } catch (error) {
        console.error("Failed to load saved widgets:", error);
      }
    }
  }, [dispatch]);

  // Save widgets to localStorage whenever widgets change
  useEffect(() => {
    localStorage.setItem("dashboard-widgets", JSON.stringify(widgets));
  }, [widgets]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addWidgetHandler = (config: WidgetConfig) => {
    if (editingWidget) {
      // Update existing widget
      dispatch(updateWidget({ id: editingWidget.id, config }));
      // Fetch updated data
      const updatedWidget = {
        ...editingWidget,
        title: config.name,
        type:
          config.displayMode === "card"
            ? WidgetType.CARD
            : config.displayMode === "table"
            ? WidgetType.TABLE
            : WidgetType.CHART,
        apiUrl: config.apiUrl,
        refreshInterval: config.refreshInterval,
        selectedFields: config.selectedFields,
        headers: config.headers,
      };
    } else {
      // Create new widget
      const id = generateId();

      // Create the widget object that matches what we're adding to Redux
      const newWidget: Widget = {
        id,
        title: config.name,
        type:
          config.displayMode === "card"
            ? WidgetType.CARD
            : config.displayMode === "table"
            ? WidgetType.TABLE
            : WidgetType.CHART,
        apiUrl: config.apiUrl,
        refreshInterval: config.refreshInterval,
        selectedFields: config.selectedFields,
        headers: config.headers,
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        isLoading: true,
      };

      // Add widget to Redux store
      dispatch(addWidget({ config, id }));
    }
    dispatch(closeModal());
  };

  const refreshWidget = (widgetId: string) => {
    // TanStack Query handles refresh via the refetch function in each widget component
    console.log(
      `Refresh request for widget: ${widgetId} - handled by TanStack Query`
    );
  };

  const configureWidget = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (widget) {
      dispatch(openEditModal(widget));
    }
  };

  const deleteWidgetHandler = (widgetId: string) => {
    dispatch(deleteWidget(widgetId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex((item) => item.id === active.id);
      const newIndex = widgets.findIndex((item) => item.id === over?.id);
      dispatch(reorderWidgets({ oldIndex, newIndex }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <DashboardHeader
        onAddWidget={() => dispatch(openAddModal())}
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
                Create custom widgets by connecting to any finance API. Track
                stocks, crypto, market data - in real-time.
              </p>
              <button
                onClick={() => dispatch(openAddModal())}
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
                        onRefresh={refreshWidget}
                        onConfigure={configureWidget}
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
                        onRefresh={refreshWidget}
                        onConfigure={configureWidget}
                        onDelete={deleteWidgetHandler}
                      />
                    ))}

                  {/* Add Widget Card */}
                  <AddWidgetCard onClick={() => dispatch(openAddModal())} />
                </div>
              </SortableContext>
            </div>
          </DndContext>
        )}
      </main>

      <AddWidgetModal
        isOpen={isAddModalOpen}
        onClose={() => dispatch(closeModal())}
        onAddWidget={addWidgetHandler}
        editingWidget={editingWidget}
      />
    </div>
  );
}
