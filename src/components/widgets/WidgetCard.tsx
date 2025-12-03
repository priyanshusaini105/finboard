"use client";

import { RefreshCw, Settings, X } from "lucide-react";
import { Widget } from "../../types/widget";

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
  // Dummy data for demonstration
  const dummyData = {
    "Stock Price": {
      symbol: "RELIANCE",
      price: 2850.50,
      change: 45.25,
      changePercent: 1.62,
      high: 2950,
      low: 2800,
    },
    "Crypto Value": {
      symbol: "BTC",
      price: 52480.25,
      change: 1250,
      changePercent: 2.43,
      marketCap: "1.04T",
      volume: "28.5B",
    },
    "Market Index": {
      index: "NIFTY 50",
      value: 19450.80,
      change: 285.60,
      changePercent: 1.49,
      companies: 50,
      volume: "2.4B",
    },
  };

  const currentData =
    dummyData[widget.title as keyof typeof dummyData] || dummyData["Stock Price"];
  const isPositive = currentData.change >= 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none hover:shadow-md transition-shadow">
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-slate-900 dark:text-white">
            {widget.title}
          </h3>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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

      {/* Widget Content */}
      <div className="p-4 space-y-3">
        <div className="bg-slate-700/50 p-3 rounded-lg">
          {/* Display symbol/index and price */}
          {currentData.symbol ? (
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-300 text-sm font-medium">
                {currentData.symbol}
              </span>
              <span className="text-white text-xl font-bold">
                ₹{currentData.price.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-300 text-sm font-medium">
                {currentData.index}
              </span>
              <span className="text-white text-xl font-bold">
                {currentData.value.toLocaleString()}
              </span>
            </div>
          )}

          {/* Price change */}
          <div className={`flex items-center space-x-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
            <span className="text-sm font-medium">
              {isPositive ? "+" : ""}₹{Math.abs(currentData.change).toFixed(2)}
            </span>
            <span className="text-sm">
              ({isPositive ? "+" : ""}{currentData.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Additional info */}
        <div className="space-y-2">
          {currentData.high && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">High</span>
              <span className="text-white font-medium">₹{currentData.high.toLocaleString()}</span>
            </div>
          )}
          {currentData.low && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Low</span>
              <span className="text-white font-medium">₹{currentData.low.toLocaleString()}</span>
            </div>
          )}
          {currentData.marketCap && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Market Cap</span>
              <span className="text-white font-medium">{currentData.marketCap}</span>
            </div>
          )}
          {currentData.volume && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Volume</span>
              <span className="text-white font-medium">
                {typeof currentData.volume === "string" ? currentData.volume : currentData.volume.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 pt-2 border-t border-slate-600">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
