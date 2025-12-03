import { lazy } from "react";

// Lazy load heavy widget components
export const LazyWidgetChart = lazy(() => import("./widgets/WidgetChart"));
export const LazyWidgetTable = lazy(() => import("./widgets/WidgetTable"));
export const LazyWidgetCard = lazy(() => import("./widgets/WidgetCard"));

// Lazy load dashboard
export const LazyDashboard = lazy(() => import("./dashboard/Dashboard"));

// Lazy load modals (only loaded when needed)
export const LazyAddWidgetModal = lazy(
  () => import("./dashboard/AddWidgetModal")
);

// Lazy load debug components (only in development)
export const LazyCacheInspector = lazy(() => import("./debug/CacheInspector"));
