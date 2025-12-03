"use client";

import { useState } from "react";
import {
  RefreshCw,
  Settings,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Widget } from "../../types/widget";
import { useWidgetData } from "../../hooks/useWidgetData";

interface WidgetTableProps {
  widget: Widget;
  onRefresh: (widgetId: string) => void;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function WidgetTable({
  widget,
  onRefresh,
  onConfigure,
  onDelete,
}: WidgetTableProps) {
  // Use TanStack Query for data fetching with caching
  const { data, isLoading, error, refetch, isFetching } = useWidgetData(widget);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const getValueFromPath = (obj: any, path: string): any => {
    // Handle array notation like "trending_stocks.top_gainers[].company_name"
    if (path.includes("[]")) {
      const [arrayPath, propertyPath] = path.split("[].");
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

    // Handle normal dot notation
    return path.split(".").reduce((current, key) => current?.[key], obj);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return String(value);
  };

  // Convert data to array format for table display
  const getTableData = () => {
    if (!data?.data) return [];

    // Data is already transformed by the Dashboard using transformData()
    // It should be an array of objects ready for table display
    if (Array.isArray(data.data)) {
      return data.data;
    }

    // Fallback: if data is not an array, convert single object to array
    if (typeof data.data === "object") {
      return [data.data];
    }

    return [];
  };
  const tableData = getTableData();

  // Filter data based on search term
  const filteredData = tableData.filter((row: any) => {
    if (!searchTerm) return true;

    return widget.selectedFields?.some((field) => {
      let value;

      // Handle array notation fields
      if (field.includes("[]")) {
        const propertyName = field.split("[]").pop()?.replace(/^\./, "");
        value = propertyName ? row[propertyName] : row;
      } else if (field.includes(".")) {
        // For non-array fields, use the original path logic
        value = getValueFromPath(row, field);
      } else {
        // Direct property access
        value = row[field];
      }

      // Skip N/A values and null/undefined values in search
      if (!value || value === "N/A" || value === null || value === undefined) {
        return false;
      }

      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

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
          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
            TABLE
          </span>
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

      {/* Search and Controls */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400">
            {filteredData.length} of {tableData.length} items
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {error ? (
          <div className="p-4 text-red-400 text-sm">Error: {error.message}</div>
        ) : isLoading ? (
          <div className="p-4 text-slate-400 text-sm">Loading...</div>
        ) : paginatedData.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                {widget.selectedFields?.map((field) => {
                  // Better field name formatting for display
                  let displayName = field;
                  if (field.includes("[]")) {
                    displayName =
                      field.split("[]").pop()?.replace(/^\./, "") || field;
                  } else {
                    displayName = field.split(".").pop() || field;
                  }

                  return (
                    <th
                      key={field}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                    >
                      {displayName.replace(/_/g, " ")}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedData.map((row: any, index: number) => (
                <tr
                  key={index}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  {widget.selectedFields?.map((field) => {
                    let value;

                    // Handle array notation fields
                    if (field.includes("[]")) {
                      const propertyName = field
                        .split("[]")
                        .pop()
                        ?.replace(/^\./, "");
                      value = propertyName ? row[propertyName] : row;
                    } else if (field.includes(".")) {
                      // For non-array fields, use the original path logic
                      value = getValueFromPath(row, field);
                    } else {
                      // Direct property access
                      value = row[field];
                    }

                    return (
                      <td
                        key={field}
                        className="px-4 py-3 text-sm text-slate-900 dark:text-white"
                      >
                        {formatValue(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-slate-400 text-sm">No data available</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-700">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-sm text-slate-600 dark:text-slate-400">
            Page {currentPage} of {totalPages}
          </div>

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Last Updated */}
      {data?.data && (
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-500 text-center">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
