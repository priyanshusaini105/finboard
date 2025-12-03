export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 dark:bg-slate-700 rounded-lg animate-pulse"></div>
            <div>
              <div className="h-6 w-48 bg-gray-300 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 dark:bg-slate-700 rounded-lg animate-pulse"></div>
            <div className="w-32 h-10 bg-gray-300 dark:bg-slate-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Widget Skeletons */}
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm"
            >
              {/* Widget Header Skeleton */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-24 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-300 dark:bg-blue-600 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Widget Content Skeleton */}
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-1/3 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-6 w-2/3 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-1/2 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-6 w-3/4 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-1/4 bg-gray-300 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-6 w-1/2 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State Skeleton (when no widgets) */}
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-300 dark:bg-slate-700 rounded-lg mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 w-48 bg-gray-300 dark:bg-slate-700 rounded mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-slate-600 rounded mx-auto mb-6 animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-300 dark:bg-slate-700 rounded mx-auto animate-pulse"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
