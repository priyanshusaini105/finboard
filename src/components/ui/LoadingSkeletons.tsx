"use client";

// Loading skeletons for lazy-loaded components
export { default as DashboardSkeleton } from "./DashboardSkeleton";

export function WidgetSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-24"></div>
          <div className="w-2 h-2 bg-blue-200 dark:bg-blue-600 rounded-full"></div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-1/2"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-600 rounded"></div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-32"></div>
          <div className="px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded text-xs">
            CHART
          </div>
        </div>
        <div className="flex space-x-1">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
        </div>
      </div>

      {/* Chart area */}
      <div className="p-4">
        <div className="h-64 bg-slate-200 dark:bg-slate-600 rounded mb-4"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-600 rounded"></div>
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-32"></div>
          <div className="px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded text-xs">
            TABLE
          </div>
        </div>
        <div className="flex space-x-1">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded"></div>
        </div>
      </div>

      {/* Search bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded"></div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {[1, 2, 3, 4].map((i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                {[1, 2, 3, 4].map((j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-16"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-2xl animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded w-32"></div>
          <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded"></div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-20"></div>
            <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-20"></div>
            <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-32"></div>
            <div className="h-20 bg-slate-200 dark:bg-slate-600 rounded"></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded w-20"></div>
          <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}
