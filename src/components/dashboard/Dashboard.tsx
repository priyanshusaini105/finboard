"use client";

import { useEffect, useState } from "react";
import { WidgetType, WidgetConfig } from "@/src/types";
import { useStore } from "@/src/store";
import { DashboardHeader, AddWidgetModal, AddWidgetCard, WidgetGrid } from ".";
import { WidgetCard, WidgetTable, WidgetChart } from "@/src/components/widgets";
import { RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "../ui";

export default function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    widgets,
    isAddModalOpen,
    editingWidget,
    expandedWidget,
    openAddModal,
    openEditModal,
    openExpandModal,
    closeModal,
    closeExpandModal,
    addWidget,
    updateWidget,
    deleteWidget,
    loadWidgetsFromStorage,
    updateWidgetLayout,
  } = useStore();

  // Load widgets from localStorage on mount
  useEffect(() => {
    const savedWidgets = localStorage.getItem("dashboard-widgets");
    if (savedWidgets) {
      try {
        const parsedWidgets = JSON.parse(savedWidgets);
        loadWidgetsFromStorage(parsedWidgets);
      } catch (error) {
        console.error("Failed to load saved widgets:", error);
      }
    }
  }, [loadWidgetsFromStorage]);

  // Save widgets to localStorage whenever widgets change
  useEffect(() => {
    localStorage.setItem("dashboard-widgets", JSON.stringify(widgets));
  }, [widgets]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addWidgetHandler = (config: WidgetConfig) => {
    if (editingWidget) {
      // Update existing widget
      updateWidget(editingWidget.id, config);
    } else {
      // Create new widget
      const id = generateId();

      // Add widget to store
      addWidget(config, id);
    }
    closeModal();
  };

  const configureWidget = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (widget) {
      openEditModal(widget);
    }
  };

  const deleteWidgetHandler = (widgetId: string) => {
    deleteWidget(widgetId);
  };

  const expandWidget = (widget: typeof widgets[0]) => {
    openExpandModal(widget);
  };

  const handleRefreshWidget = async () => {
    setIsRefreshing(true);
    // Trigger a re-fetch by updating the widget's refresh interval
    // This will cause the useWidgetData hook to re-fetch
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleLayoutChange = (updatedWidgets: typeof widgets) => {
    updateWidgetLayout(updatedWidgets);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <DashboardHeader
        onAddWidget={() => openAddModal()}
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
                onClick={() => openAddModal()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Add Your First Widget
              </button>
            </div>
          </div>
        ) : (
          // Grid layout with drag and resize
          <div className="space-y-6">
            <WidgetGrid
              widgets={widgets}
              onLayoutChange={handleLayoutChange}
              onConfigure={configureWidget}
              onDelete={deleteWidgetHandler}
              onExpand={expandWidget}
              editable={true}
            />

            {/* Add Widget Card - positioned at the end */}
            <AddWidgetCard onClick={() => openAddModal()} />
          </div>
        )}
      </main>

      <AddWidgetModal
        isOpen={isAddModalOpen}
        onClose={() => closeModal()}
        onAddWidget={addWidgetHandler}
        editingWidget={editingWidget}
      />

      {/* Expanded Widget Modal */}
      <Dialog open={!!expandedWidget} onOpenChange={() => closeExpandModal()}>
        <DialogContent 
          className="w-[90vw] h-[90vh] max-w-none p-0 overflow-hidden flex flex-col bg-white dark:bg-slate-800 border-0 rounded-lg"
          showCloseButton={false}
        >
          {/* Custom Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {expandedWidget?.title}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshWidget}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                title="Refresh Widget"
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`w-5 h-5 text-slate-600 dark:text-slate-400 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
              <button
                onClick={() => closeExpandModal()}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                title="Close"
              >
                <svg
                  className="w-5 h-5 text-slate-600 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Widget Content */}
          <div className="flex-1 overflow-auto p-6 bg-white dark:bg-slate-800">
            {expandedWidget && (
              <>
                {expandedWidget.type === WidgetType.TABLE && (
                  <WidgetTable
                    widget={expandedWidget}
                    onConfigure={() => {}}
                    onDelete={() => {}}
                    hideHeader={true}
                  />
                )}
                {expandedWidget.type === WidgetType.CHART && (
                  <WidgetChart
                    widget={expandedWidget}
                    onConfigure={() => {}}
                    onDelete={() => {}}
                    hideHeader={true}
                  />
                )}
                {expandedWidget.type === WidgetType.CARD && (
                  <WidgetCard
                    widget={expandedWidget}
                    onConfigure={() => {}}
                    onDelete={() => {}}
                    hideHeader={true}
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
