import { BarChart3 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 w-16 h-16 bg-emerald-500 rounded-lg mx-auto animate-ping opacity-20"></div>
        </div>

        <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Loading FinBoard
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          Preparing your financial dashboard...
        </p>

        <div className="mt-4 flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
