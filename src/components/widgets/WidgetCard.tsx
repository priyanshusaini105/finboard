"use client";

import { RefreshCw, Settings, X } from "lucide-react";
import { Widget } from "../../types/widget";
import { mapFieldPath } from "../../utils/apiAdapters";
import { useWidgetData } from "../../hooks/useWidgetData";

interface WidgetCardProps {
  widget: Widget;
  onRefresh: (widgetId: string) => void;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function WidgetCard({
  widget,
  onRefresh,
  onConfigure,
  onDelete,
}: WidgetCardProps) {
  // Use TanStack Query for data fetching with caching
  const { data, isLoading, error, refetch, isFetching } = useWidgetData(widget);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    if (typeof value === "number") {
      // Format numbers with commas
      return value.toLocaleString();
    }

    if (Array.isArray(value)) {
      // If it's an array, show the count
      return `${value.length} items`;
    }

    if (typeof value === "object") {
      // If it's an object, try to find a meaningful display value
      if (value.symbol) return value.symbol;
      if (value.name) return value.name;
      if (value.title) return value.title;
      // Otherwise show [Object]
      return "[Object]";
    }

    return String(value);
  };

  const getValueFromPath = (obj: any, path: string): any => {
    // Map old field paths to new simplified paths
    const mappedPath = data?.originalData
      ? mapFieldPath(path, data.originalData)
      : path;

    // Handle array notation like "trending_stocks.top_gainers[].company_name"
    if (mappedPath.includes("[]")) {
      const [arrayPath, propertyPath] = mappedPath.split("[].");
      const arrayData = arrayPath
        .split(".")
        .reduce((current, key) => current?.[key], obj);

      if (Array.isArray(arrayData) && propertyPath) {
        // Return array of the specific property from each object
        return arrayData
          .map((item) => item?.[propertyPath])
          .filter((val) => val !== undefined);
      }
      return arrayData;
    }

    // Handle normal dot notation with proper key parsing
    const keys = mappedPath.split(".");
    let result = obj;

    for (const key of keys) {
      if (result && typeof result === "object") {
        result = result[key];
      } else {
        return undefined;
      }
    }

    return result;
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none">
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-slate-900 dark:text-white">
            {widget.title}
          </h3>
          {(isLoading || isFetching) && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => refetch()}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
            disabled={isLoading || isFetching}
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isLoading || isFetching ? "animate-spin" : ""
              }`}
            />
          </button>
          <button
            onClick={() => onConfigure(widget.id)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(widget.id)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {error ? (
          <div className="text-red-500 dark:text-red-400 text-sm">
            Error: {error.message}
          </div>
        ) : isLoading ? (
          <div className="text-slate-600 dark:text-slate-400 text-sm">
            Loading...
          </div>
        ) : data?.data ? (
          <div className="space-y-4">
            {/* Group fields by type for better presentation */}
            {(() => {
              const groupedFields = {
                basic: [] as string[],
                descriptions: [] as string[],
                arrays: [] as string[],
              };

              widget.selectedFields?.forEach((fieldPath) => {
                const value = getValueFromPath(data.data, fieldPath);
                const fieldName = fieldPath.split(".").pop() || fieldPath;

                if (Array.isArray(value)) {
                  groupedFields.arrays.push(fieldPath);
                } else if (
                  typeof value === "string" &&
                  (value.length > 100 ||
                    fieldName.toLowerCase().includes("description"))
                ) {
                  groupedFields.descriptions.push(fieldPath);
                } else {
                  groupedFields.basic.push(fieldPath);
                }
              });

              return (
                <>
                  {/* Basic Info Card */}
                  {groupedFields.basic.length > 0 && (
                    <div className="bg-slate-700/50 p-3 rounded-lg space-y-3">
                      {groupedFields.basic.map((fieldPath) => {
                        const value = getValueFromPath(data.data, fieldPath);
                        const fieldName =
                          fieldPath.split(".").pop() || fieldPath;

                        return (
                          <div
                            key={fieldPath}
                            className="flex justify-between items-center"
                          >
                            <span className="text-slate-700 dark:text-slate-300 text-sm capitalize font-medium">
                              {fieldName.replace(/_/g, " ")}
                            </span>
                            <span className="text-white font-semibold">
                              {formatValue(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Description Fields */}
                  {groupedFields.descriptions.map((fieldPath) => {
                    const value = getValueFromPath(data.data, fieldPath);
                    const fieldName = fieldPath.split(".").pop() || fieldPath;

                    return (
                      <div key={fieldPath} className="space-y-2">
                        <span className="text-slate-700 dark:text-slate-300 text-sm capitalize font-medium block">
                          {fieldName.replace(/_/g, " ")}
                        </span>
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg">
                          <p className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed line-clamp-4">
                            {formatValue(value)}
                          </p>
                          {typeof value === "string" && value.length > 300 && (
                            <button className="text-blue-400 text-xs mt-2 hover:text-blue-300 transition-colors">
                              Read more...
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Array Fields */}
                  {groupedFields.arrays.map((fieldPath) => {
                    const value = getValueFromPath(data.data, fieldPath);
                    const fieldName = fieldPath.split(".").pop() || fieldPath;

                    if (!Array.isArray(value) || value.length === 0)
                      return null;

                    return (
                      <div key={fieldPath} className="space-y-2">
                        <span className="text-slate-300 text-sm capitalize font-medium block">
                          {fieldName.replace(/_/g, " ")} ({value.length} items)
                        </span>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {value.slice(0, 5).map((item, index) => (
                            <div
                              key={index}
                              className="bg-slate-700/50 p-2 rounded text-xs"
                            >
                              {typeof item === "object" ? (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-200 font-medium">
                                      {item.company_name ||
                                        item.symbol ||
                                        item.name ||
                                        item.title ||
                                        `Item ${index + 1}`}
                                    </span>
                                    <span className="text-white font-bold">
                                      ₹{item.price || item.value || "N/A"}
                                    </span>
                                  </div>
                                  {(item.percent_change || item.net_change) && (
                                    <div className="flex justify-between text-xs">
                                      {item.percent_change && (
                                        <span
                                          className={`${
                                            parseFloat(item.percent_change) >= 0
                                              ? "text-green-400"
                                              : "text-red-400"
                                          }`}
                                        >
                                          {parseFloat(item.percent_change) >= 0
                                            ? "+"
                                            : ""}
                                          {item.percent_change}%
                                        </span>
                                      )}
                                      {item.net_change && (
                                        <span
                                          className={`${
                                            parseFloat(item.net_change) >= 0
                                              ? "text-green-400"
                                              : "text-red-400"
                                          }`}
                                        >
                                          {parseFloat(item.net_change) >= 0
                                            ? "+"
                                            : ""}
                                          ₹{item.net_change}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-white">
                                  {String(item)}
                                </span>
                              )}
                            </div>
                          ))}
                          {value.length > 5 && (
                            <div className="text-xs text-slate-400 text-center">
                              ... and {value.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {data.data.timestamp && (
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-400 text-sm">No data available</div>
        )}
      </div>
    </div>
  );
}
