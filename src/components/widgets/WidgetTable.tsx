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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Dummy data for table
  const dummyTableData = [
    {
      symbol: "TCS",
      price: 3850.50,
      change: 45.25,
      percent: "1.19%",
      volume: "2.5M",
      high: 3920,
      low: 3800,
    },
    {
      symbol: "RELIANCE",
      price: 2850.50,
      change: 125.75,
      percent: "4.62%",
      volume: "5.2M",
      high: 2950,
      low: 2750,
    },
    {
      symbol: "INFY",
      price: 1650.25,
      change: -32.50,
      percent: "-1.93%",
      volume: "3.8M",
      high: 1720,
      low: 1620,
    },
    {
      symbol: "HCLTECH",
      price: 1520.75,
      change: 65.30,
      percent: "4.49%",
      volume: "1.2M",
      high: 1560,
      low: 1450,
    },
    {
      symbol: "WIPRO",
      price: 410.50,
      change: -15.25,
      percent: "-3.58%",
      volume: "4.5M",
      high: 440,
      low: 405,
    },
    {
      symbol: "BAJAJFINSV",
      price: 1580.30,
      change: 95.70,
      percent: "6.44%",
      volume: "890K",
      high: 1620,
      low: 1480,
    },
  ];

  // Filter data based on search term
  const filteredData = dummyTableData.filter((row) => {
    if (!searchTerm) return true;
    return (
      row.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.percent.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
            TABLE
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onRefresh(widget.id)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
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
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400 ml-4">
            {filteredData.length} of {dummyTableData.length} items
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Change
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                % Change
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Volume
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                  {row.symbol}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                  ₹{row.price.toLocaleString()}
                </td>
                <td className={`px-4 py-3 text-sm font-medium ${
                  row.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {row.change >= 0 ? "+" : ""}₹{row.change.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-sm font-medium ${
                  row.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {row.percent}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                  {row.volume}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-500 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
