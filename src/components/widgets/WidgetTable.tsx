"use client";

import { useState, JSX, useEffect } from "react";
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
import { type ApiError } from "../../utils/errorHandler";
import { mapFieldPath, getValueFromPath } from "../../utils/apiAdapters";
import type { ColumnDefinition } from "../../utils/commonFinancialSchema";
import { useStore } from "../../store/useStore";

interface WidgetTableProps {
  widget: Widget;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function WidgetTable({
  widget,
  onConfigure,
  onDelete,
}: WidgetTableProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(widget.title);
  const { updateWidgetTitle } = useStore();

  // Use TanStack Query for data fetching with enhanced error recovery
  const queryResult = useWidgetData(widget);
  const widgetData = queryResult.data; // This is the WidgetDataResult
  const data = widgetData?.data; // The actual table rows
  const columns = widgetData?.columns as ColumnDefinition[] | undefined;
  const useTransformedData = widgetData?.useTransformedData;
  const isLoading: boolean = queryResult.isLoading;
  const error = queryResult.error;
  const errorMessage = queryResult.errorMessage;
  const refetch = queryResult.refetch;
  const isFetching: boolean = queryResult.isFetching;
  const isFromCache = queryResult.isFromCache;
  const rateLimitInfo = queryResult.rateLimitInfo;

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditingTitle(widget.title);
  };

  const handleTitleSave = () => {
    if (editingTitle.trim() && editingTitle !== widget.title) {
      updateWidgetTitle(widget.id, editingTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      handleTitleSave();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setEditingTitle(widget.title);
      setIsEditingTitle(false);
    }
  };

  const getValueFromPath = (
    obj: Record<string, unknown>,
    path: string
  ): unknown => {
    // Handle array notation like "trending_stocks.top_gainers[].company_name"
    if (path.includes("[]")) {
      const [arrayPath, propertyPath] = path.split("[].");
      const arrayData = arrayPath
        .split(".")
        .reduce((current: unknown, key: string) => {
          if (current && typeof current === "object" && key in current) {
            return (current as Record<string, unknown>)[key];
          }
          return undefined;
        }, obj as unknown);

      if (Array.isArray(arrayData) && propertyPath) {
        // Return array of the specific property from each object
        return arrayData
          .map((item) => {
            if (item && typeof item === "object" && propertyPath in item) {
              return (item as Record<string, unknown>)[propertyPath];
            }
            return undefined;
          })
          .filter((val) => val !== undefined);
      }
      return arrayData;
    }

    // Handle normal dot notation
    return path.split(".").reduce((current: unknown, key: string) => {
      if (current && typeof current === "object" && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "N/A";
    if (Array.isArray(value)) {
      return value.map((v) => String(v)).join(", ");
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return String(value);
  };

  useEffect(() => {
    // Debug logging to trace data flow
    console.log('=== WidgetTable Debug ===');
    console.log('1. Widget config:', widget);
    console.log('2. Query result:', queryResult);
    console.log('3. widgetData:', widgetData);
    console.log('4. data (rows):', data);
    console.log('5. columns:', columns);
    console.log('6. useTransformedData:', useTransformedData);
    console.log('7. tableData:', getTableData());
    console.log('========================');
  }, [widget, queryResult, widgetData, data, columns, useTransformedData]);

  // Convert data to array format for table display
  const getTableData = () => {
    if (!data) return [];

    // Data is already transformed by the Dashboard using transformData()
    // It should be an array of objects ready for table display
    if (Array.isArray(data)) {
      return data;
    }

    // Fallback: if data is not an array, convert single object to array
    if (typeof data === "object") {
      return [data];
    }

    return [];
  };
  const tableData = getTableData();

  // Filter data based on search term
  const filteredData = tableData.filter((row: Record<string, unknown>) => {
    if (!searchTerm) return true;

    // Use columns from transformed data if available
    const fieldsToSearch = useTransformedData && columns 
      ? columns.map(col => col.key)
      : (widget.selectedFields || Object.keys(row));

    return fieldsToSearch.some((field) => {
      let value;

      // Handle array notation fields (for non-transformed data)
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

  // Render table content with proper typing
  const renderTableContent = (): JSX.Element => {
    if (error) {
      const typedError = error as ApiError;
      const isRetryable = typedError?.isRetryable;
      const category = typedError?.category || "UNKNOWN";

      return (
        <div className="p-4 space-y-3">
          {/* Error Icon and Title */}
          <div className="flex items-start space-x-3">
            <div className="shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-red-100 dark:bg-red-900/30">
                <span className="text-lg">⚠️</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-red-900 dark:text-red-100">
                Failed to load data
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {errorMessage}
              </p>
            </div>
          </div>

          {/* Error Details */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-red-600 dark:text-red-400 font-medium">Error Type:</span>
              <span className="text-red-800 dark:text-red-200">{category}</span>
            </div>
            {typedError?.statusCode && (
              <div className="flex justify-between">
                <span className="text-red-600 dark:text-red-400 font-medium">Status Code:</span>
                <span className="text-red-800 dark:text-red-200">
                  {typedError.statusCode}
                </span>
              </div>
            )}
            {typedError?.retryAfter && (
              <div className="flex justify-between">
                <span className="text-red-600 dark:text-red-400 font-medium">Retry After:</span>
                <span className="text-red-800 dark:text-red-200">
                  {typedError.retryAfter} seconds
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            {isRetryable ? (
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                <span>{isFetching ? "Retrying..." : "Retry"}</span>
              </button>
            ) : (
              <button
                onClick={() => onConfigure(widget.id)}
                className="flex items-center space-x-1 px-3 py-2 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded text-sm font-medium transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Configure</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    if (isLoading) {
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

    if (paginatedData.length === 0) {
      return (
        <div className="p-4 text-slate-400 text-sm">No data available</div>
      );
    }

    return (
      <table className="w-full">
        <thead className="bg-slate-100 dark:bg-slate-700">
          <tr>
            {useTransformedData && columns ? (
              // Use columns from transformed data
              columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  style={{ textAlign: column.align || 'left' }}
                >
                  {column.label}
                </th>
              ))
            ) : (
              // Fallback to selectedFields for non-transformed data
              widget.selectedFields?.map((field) => {
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
              })
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {paginatedData.map((row: Record<string, unknown>, index: number) => (
            <tr
              key={index}
              className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              {useTransformedData && columns ? (
                // Use columns from transformed data
                columns.map((column) => {
                  const value = row[column.key];
                  
                  return (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-slate-900 dark:text-white"
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {formatValue(value)}
                    </td>
                  );
                })
              ) : (
                // Fallback to selectedFields for non-transformed data
                widget.selectedFields?.map((field) => {
                  let value: unknown;

                  // Attempt to map the field to a simplified key
                  const mappedField = mapFieldPath(field, widgetData?.originalData);

                  // Try to get value using mapped field first
                  if (mappedField.includes("[]")) {
                    const propertyName = mappedField
                      .split("[]")
                      .pop()
                      ?.replace(/^\./, "");
                    value = propertyName ? getValueFromPath(row, propertyName) : row;
                  } else if (mappedField.includes(".")) {
                    value = getValueFromPath(row, mappedField);
                  } else {
                    value = row[mappedField];
                  }

                  // Fallback to original field if mapped value is undefined
                  if (value === undefined) {
                      if (field.includes("[]")) {
                        const propertyName = field
                          .split("[]")
                          .pop()
                          ?.replace(/^\./, "");
                        value = propertyName ? getValueFromPath(row, propertyName) : row;
                      } else if (field.includes(".")) {
                        value = getValueFromPath(row, field);
                      } else {
                        value = row[field];
                      }
                  }

                  return (
                    <td
                      key={field}
                      className="px-4 py-3 text-sm text-slate-900 dark:text-white"
                    >
                      {formatValue(value)}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none">
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => {
                e.stopPropagation();
                setEditingTitle(e.target.value);
              }}
              onBlur={(e) => {
                e.stopPropagation();
                handleTitleSave();
              }}
              onKeyDown={handleTitleKeyDown}
              className="font-medium text-slate-900 dark:text-white bg-transparent border-b border-slate-400 focus:border-blue-500 outline-none px-1 py-0.5"
              autoFocus
            />
          ) : (
            <h3
              className="font-medium text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onDoubleClick={handleTitleDoubleClick}
              title="Double-click to edit title"
            >
              {widget.title}
            </h3>
          )}
          {(isLoading || isFetching) && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
          {isFromCache && (
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Using cached data"></div>
          )}
          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
            TABLE
          </span>
          {rateLimitInfo && (
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                rateLimitInfo.tokensRemaining > 10
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : rateLimitInfo.tokensRemaining > 0
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              }`}
              title={`${rateLimitInfo.tokensRemaining} requests remaining`}
            >
              {rateLimitInfo.tokensRemaining} left
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => refetch()}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
            disabled={isLoading || isFetching}
            title="Refresh data"
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
            title="Configure widget"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(widget.id)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
            title="Delete widget"
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

      <div className="overflow-x-auto overflow-y-auto">{renderTableContent()}</div>

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

      {!!data && (
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-500 text-center space-y-1">
          <div>
            Last updated: {new Date().toLocaleTimeString()}
            {isFromCache && " (from cache)"}
          </div>
        </div>
      )}
    </div>
  );
}
