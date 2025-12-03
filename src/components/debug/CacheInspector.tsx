"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function CacheInspector() {
  const queryClient = useQueryClient();
  const [showCache, setShowCache] = useState(false);

  const getCacheData = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    return queries.map((query) => ({
      queryKey: query.queryKey,
      state: query.state.status,
      dataUpdatedAt: new Date(query.state.dataUpdatedAt).toLocaleTimeString(),
      isStale: query.isStale(),
      data: query.state.data ? "Data Available" : "No Data",
    }));
  };

  const clearCache = () => {
    queryClient.clear();
    console.log("🗑️ Cache cleared!");
  };

  if (!showCache) {
    return (
      <button
        onClick={() => setShowCache(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg z-50"
      >
        🔍 Show Cache
      </button>
    );
  }

  const cacheData = getCacheData();

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg p-4 max-w-md max-h-96 overflow-auto z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">TanStack Query Cache</h3>
        <button
          onClick={() => setShowCache(false)}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        {cacheData.length === 0 ? (
          <p className="text-slate-400">No cached queries</p>
        ) : (
          cacheData.map((query, index) => (
            <div key={index} className="bg-slate-700 p-2 rounded">
              <div className="text-blue-400 font-mono">
                {JSON.stringify(query.queryKey)}
              </div>
              <div className="text-green-400">Status: {query.state}</div>
              <div className="text-yellow-400">
                Updated: {query.dataUpdatedAt}
              </div>
              <div className="text-white">
                ✅ Cached
                {query.isStale && " (Stale)"}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 space-x-2">
        <button
          onClick={() => setShowCache(false)}
          className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs"
        >
          Close
        </button>
        <button
          onClick={clearCache}
          className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}
