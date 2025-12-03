"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts";
import { RefreshCw, Settings, X, TrendingUp, TrendingDown } from "lucide-react";
import { Widget } from "../../types/widget";

interface WidgetChartProps {
  widget: Widget;
  onRefresh: (widgetId: string) => void;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function WidgetChart({
  widget,
  onRefresh,
  onConfigure,
  onDelete,
}: WidgetChartProps) {
  // Dummy chart data
  const chartData = useMemo(() => {
    const baseDate = new Date();
    const data = [];
    for (let i = 20; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const basePrice = 2800 + Math.random() * 200 - 100;
      data.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        price: Math.round(basePrice + i * 2.5 + Math.random() * 50),
        volume: Math.floor(Math.random() * 5000000) + 1000000,
        dma50: Math.round(2800 + i * 2),
        dma200: Math.round(2780 + i * 1.5),
      });
    }
    return data;
  }, []);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { change: 0, percentage: 0 };

    const latestPrice = chartData[chartData.length - 1]?.price || 0;
    const previousPrice = chartData[0]?.price || 0;
    const change = latestPrice - previousPrice;
    const percentage = previousPrice ? (change / previousPrice) * 100 : 0;

    return { change, percentage };
  }, [chartData]);

  const isPositive = priceChange.change >= 0;
  const currentPrice = chartData[chartData.length - 1]?.price || 0;

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 shadow-lg">
          <p className="text-slate-300 text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === "price" && "₹"}
              {entry.dataKey === "volume" && "Vol: "}
              {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none">
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-slate-900 dark:text-white">
                {widget.title}
              </h3>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-mono">
                RELIANCE
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                ₹{currentPrice.toLocaleString()}
              </span>
              <div
                className={`flex items-center space-x-1 ${
                  isPositive ? "text-green-400" : "text-red-400"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isPositive ? "+" : ""}₹
                  {Math.abs(priceChange.change).toFixed(2)} (
                  {isPositive ? "+" : ""}
                  {priceChange.percentage.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
            CHART
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

      {/* Chart Content */}
      <div className="p-4 space-y-4">
        {/* Price Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickMargin={5}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                domain={["dataMin - 10", "dataMax + 10"]}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Price Line */}
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Price"
              />

              {/* Moving Averages */}
              <Line
                type="monotone"
                dataKey="dma50"
                stroke="#F59E0B"
                strokeWidth={1}
                dot={false}
                name="50 DMA"
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="dma200"
                stroke="#EF4444"
                strokeWidth={1}
                dot={false}
                name="200 DMA"
                strokeDasharray="5 5"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div className="h-32">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Volume</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={10}
                tickMargin={5}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={10}
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(value: any) => [
                  `${(value / 1000000).toFixed(2)}M`,
                  "Volume",
                ]}
                labelStyle={{ color: "#9CA3AF" }}
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                }}
              />
              <Bar dataKey="volume" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
