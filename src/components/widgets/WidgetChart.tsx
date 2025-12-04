"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
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
  Area,
  Scatter,
  ScatterChart,
} from "recharts";
import { RefreshCw, Settings, X, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Widget } from "@/src/types";
import { getSymbolFromUrl, formatForChartView, getRollingWindowStats, type ChartDataPoint } from "@/src/utils";
import { useWidgetData, useRealtimeData } from "@/src/hooks";
import { ChartSkeleton, WidgetRealtimeIndicator } from "@/src/components";
import { useStore } from "@/src/store";

interface TooltipPayload {
  dataKey: string;
  value: number;
  color: string;
  payload?: ChartDataPoint;
}

// Chart type definitions
type ChartType = 
  | 'candlestick'
  | 'ohlc'
  | 'line'
  | 'area'
  | 'bar'
  | 'line-volume'
  | 'area-volume'
  | 'scatter'
  | 'multi-line';

interface ChartOption {
  id: ChartType;
  name: string;
  description: string;
  requiredFields: string[];
  category: 'candlestick' | 'standard' | 'combined';
}

// Custom tooltip for the chart - defined outside component
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload as ChartDataPoint;
    
    return (
      <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 shadow-lg">
        <p className="text-slate-300 text-sm mb-2 font-semibold">{label}</p>
        
        {/* Show OHLC data if available */}
        {dataPoint?.open !== undefined && (
          <div className="space-y-1 mb-2 pb-2 border-b border-slate-600">
            <p className="text-sm text-green-400">Open: ₹{dataPoint.open.toLocaleString()}</p>
            <p className="text-sm text-blue-400">High: ₹{dataPoint.high?.toLocaleString()}</p>
            <p className="text-sm text-red-400">Low: ₹{dataPoint.low?.toLocaleString()}</p>
            <p className="text-sm text-yellow-400">Close: ₹{dataPoint.close?.toLocaleString()}</p>
          </div>
        )}
        
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.dataKey === "price" && "Price: ₹"}
            {entry.dataKey === "volume" && "Vol: "}
            {entry.dataKey === "dma50" && "50 DMA: ₹"}
            {entry.dataKey === "dma200" && "200 DMA: ₹"}
            {!['price', 'volume', 'dma50', 'dma200', 'open', 'high', 'low', 'close'].includes(entry.dataKey) && `${entry.dataKey}: `}
            {entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Candlestick shape component
const Candlestick = (props: unknown) => {
  const { x, y, width, height, payload } = props as { x: number; y: number; width: number; height: number; payload: Record<string, number> };
  
  if (!payload || payload.open === undefined || payload.close === undefined || 
      payload.high === undefined || payload.low === undefined) {
    return <g />;
  }

  const { open, close, high, low } = payload;
  const isGreen = close >= open;
  const color = isGreen ? '#10b981' : '#ef4444';
  
  // Use the Bar's positioning (y is already scaled by Recharts)
  // The Bar gives us the top of the high value
  const ratio = height / (high - low);
  
  const highY = y; // Top of the bar (high value)
  const lowY = y + height; // Bottom position based on height
  const openY = y + (high - open) * ratio;
  const closeY = y + (high - close) * ratio;
  
  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.abs(openY - closeY) || 1;
  const candleWidth = Math.max(width * 0.6, 2);
  const candleX = x + (width - candleWidth) / 2;
  
  return (
    <g>
      {/* Wick (high-low line) */}
      <line
        x1={x + width / 2}
        y1={highY}
        x2={x + width / 2}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body (open-close rectangle) */}
      <rect
        x={candleX}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={isGreen ? color : 'none'}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  );
};

// OHLC bar component
const OHLCBar = (props: unknown) => {
  const { x, y, width, height, payload } = props as { x: number; y: number; width: number; height: number; payload: Record<string, number> };
  
  if (!payload || payload.open === undefined || payload.close === undefined || 
      payload.high === undefined || payload.low === undefined) {
    return <g />;
  }

  const { open, close, high, low } = payload;
  const isGreen = close >= open;
  const color = isGreen ? '#10b981' : '#ef4444';
  
  // Use the Bar's positioning
  const ratio = height / (high - low);
  
  const highY = y;
  const lowY = y + height;
  const openY = y + (high - open) * ratio;
  const closeY = y + (high - close) * ratio;
  
  const halfWidth = width / 2;
  const centerX = x + halfWidth;
  
  return (
    <g>
      {/* Vertical line (high-low) */}
      <line
        x1={centerX}
        y1={highY}
        x2={centerX}
        y2={lowY}
        stroke={color}
        strokeWidth={2}
      />
      {/* Open tick (left) */}
      <line
        x1={x}
        y1={openY}
        x2={centerX}
        y2={openY}
        stroke={color}
        strokeWidth={2}
      />
      {/* Close tick (right) */}
      <line
        x1={centerX}
        y1={closeY}
        x2={x + width}
        y2={closeY}
        stroke={color}
        strokeWidth={2}
      />
    </g>
  );
};

interface WidgetChartProps {
  widget: Widget;
  onConfigure: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
  hideHeader?: boolean;
}

function WidgetChartComponent({
  widget,
  hideHeader = false,
}: WidgetChartProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(widget.title);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line');
  const [showChartMenu, setShowChartMenu] = useState(false);
  const { updateWidgetTitle } = useStore();

  // Use TanStack Query for data fetching with caching
  const { data, isLoading, error, isFetching } = useWidgetData(widget);

  // Transform API data for chart display using universal adapter
  const chartData = useMemo(() => {
    if (!data?.data) return [] as ChartDataPoint[];

    try {
      // Data is already transformed by the Dashboard using transformData()
      // So we can use it directly
      const dataArray = Array.isArray(data.data) ? (data.data as ChartDataPoint[]) : [];
      return dataArray.map(point => ({
        ...point,
        fullDate: point.fullDate || point.date // Ensure fullDate is set
      }));
    } catch (error) {
      console.error("Error using chart data:", error);
      return [];
    }
  }, [data?.data]);

  // Setup real-time data connection
  const realtimeResult = useRealtimeData(widget, chartData);

  // Merge polling data with real-time data (prefer real-time if connected)
  // Format data for chart display with proper time labels
  const displayData = useMemo(() => {
    if (realtimeResult.isConnected && realtimeResult.realtimeData.length > 0) {
      // Format real-time data for chart view - show all recorded data (up to 1000 points)
      return formatForChartView(realtimeResult.realtimeData, 1000);
    }
    return chartData;
  }, [chartData, realtimeResult.isConnected, realtimeResult.realtimeData]);

  // Get statistics for real-time data
  const rollingStats = useMemo(() => {
    if (realtimeResult.isConnected && realtimeResult.realtimeData.length > 0) {
      return getRollingWindowStats(realtimeResult.realtimeData);
    }
    return null;
  }, [realtimeResult.isConnected, realtimeResult.realtimeData]);

  // Detect available fields in the data
  const availableFields = useMemo(() => {
    if (displayData.length === 0) return [];
    const fields = new Set<string>();
    displayData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'date' && typeof point[key] === 'number') {
          fields.add(key);
        }
      });
    });
    return Array.from(fields);
  }, [displayData]);

  // Define available chart types based on data
  const chartOptions = useMemo((): ChartOption[] => {
    const hasOHLC = availableFields.includes('open') && 
                    availableFields.includes('high') && 
                    availableFields.includes('low') && 
                    availableFields.includes('close');
    const hasVolume = availableFields.includes('volume');
    const hasPrice = availableFields.includes('price') || availableFields.includes('close');
    const numericFields = availableFields.filter(f => !['volume', 'open', 'high', 'low', 'close'].includes(f));

    const options: ChartOption[] = [];

    // Candlestick charts (if OHLC data available)
    if (hasOHLC) {
      options.push({
        id: 'candlestick',
        name: 'Candlestick',
        description: 'Traditional candlestick chart',
        requiredFields: ['open', 'high', 'low', 'close'],
        category: 'candlestick'
      });
      
      options.push({
        id: 'ohlc',
        name: 'OHLC Bars',
        description: 'Open-High-Low-Close bar chart',
        requiredFields: ['open', 'high', 'low', 'close'],
        category: 'candlestick'
      });
    }

    // Standard charts
    if (hasPrice || numericFields.length > 0) {
      options.push({
        id: 'line',
        name: 'Line Chart',
        description: 'Simple line chart',
        requiredFields: hasPrice ? ['price'] : [numericFields[0]],
        category: 'standard'
      });

      options.push({
        id: 'area',
        name: 'Area Chart',
        description: 'Filled area chart',
        requiredFields: hasPrice ? ['price'] : [numericFields[0]],
        category: 'standard'
      });

      if (numericFields.length >= 2) {
        options.push({
          id: 'multi-line',
          name: 'Multi-Line',
          description: 'Multiple metrics on one chart',
          requiredFields: numericFields.slice(0, 4),
          category: 'standard'
        });

        options.push({
          id: 'scatter',
          name: 'Scatter Plot',
          description: 'Correlation between metrics',
          requiredFields: numericFields.slice(0, 2),
          category: 'standard'
        });
      }
    }

    // Combined with volume
    if (hasVolume && hasPrice) {
      options.push({
        id: 'line-volume',
        name: 'Line + Volume',
        description: 'Price line with volume bars',
        requiredFields: ['price', 'volume'],
        category: 'combined'
      });

      options.push({
        id: 'area-volume',
        name: 'Area + Volume',
        description: 'Price area with volume bars',
        requiredFields: ['price', 'volume'],
        category: 'combined'
      });
    }

    if (hasVolume) {
      options.push({
        id: 'bar',
        name: 'Volume Bars',
        description: 'Volume bar chart',
        requiredFields: ['volume'],
        category: 'standard'
      });
    }

    return options;
  }, [availableFields]);

  // Track if chart type has been manually selected by user
  const hasUserSelectedChart = useRef(false);

  // Auto-select best chart type based on available data (only on initial mount)
  useEffect(() => {
    if (chartOptions.length > 0 && !hasUserSelectedChart.current) {
      const hasOHLC = availableFields.includes('open');
      if (hasOHLC && chartOptions.find(opt => opt.id === 'candlestick')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedChartType('candlestick');
      } else if (!selectedChartType || !chartOptions.find(opt => opt.id === selectedChartType)) {
        setSelectedChartType(chartOptions[0].id);
      }
    }
  }, [chartOptions, availableFields, selectedChartType]);

  // Calculate price change from display data (comparing first and last points)
  const priceChange = useMemo(() => {
    if (displayData.length < 2) return { change: 0, percentage: 0 };

    const latestPrice = displayData[displayData.length - 1]?.price || 0;
    const firstPrice = displayData[0]?.price || latestPrice;
    const change = latestPrice - firstPrice;
    const percentage = firstPrice ? (change / firstPrice) * 100 : 0;

    return { change, percentage };
  }, [displayData]);

  const isPositive = priceChange.change >= 0;
  const currentPrice = displayData[displayData.length - 1]?.close || displayData[displayData.length - 1]?.price || 0;

  // Extract stock symbol from API URL
  const stockSymbol = useMemo(() => {
    if (widget.apiUrl) {
      return getSymbolFromUrl(widget.apiUrl);
    }
    return "STOCK";
  }, [widget.apiUrl]);

  const handleTitleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditingTitle(widget.title);
  }, [widget.title]);

  const handleTitleSave = useCallback(() => {
    if (editingTitle.trim() && editingTitle !== widget.title) {
      updateWidgetTitle(widget.id, editingTitle.trim());
    }
    setIsEditingTitle(false);
  }, [editingTitle, widget.id, widget.title, updateWidgetTitle]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      handleTitleSave();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setEditingTitle(widget.title);
      setIsEditingTitle(false);
    }
  }, [widget.title, handleTitleSave]);

  // Render chart based on selected type
  const renderChart = () => {
    const colors = ['#3B82F6', '#10b981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    
    switch (selectedChartType) {
      case 'candlestick':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="low"
                stackId="candle"
                fill="transparent"
                isAnimationActive={false}
              />
              <Bar
                dataKey="high"
                stackId="candle"
                shape={Candlestick}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'ohlc':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="low"
                stackId="ohlc"
                fill="transparent"
                isAnimationActive={false}
              />
              <Bar
                dataKey="high"
                stackId="ohlc"
                shape={OHLCBar}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'area':
        const priceKey = availableFields.includes('close') ? 'close' : 'price';
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={['dataMin - 10', 'dataMax + 10']} tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey={priceKey} stroke="#3B82F6" fillOpacity={1} fill="url(#colorPrice)" name="Price" />
              {chartData.some(d => d.dma50) && <Line type="monotone" dataKey="dma50" stroke="#F59E0B" strokeWidth={1} dot={false} name="50 DMA" strokeDasharray="5 5" />}
              {chartData.some(d => d.dma200) && <Line type="monotone" dataKey="dma200" stroke="#EF4444" strokeWidth={1} dot={false} name="200 DMA" strokeDasharray="5 5" />}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M`, "Volume"]} />
              <Legend />
              <Bar dataKey="volume" fill="#6366F1" name="Volume" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        const [xField, yField] = availableFields.filter(f => f !== 'volume').slice(0, 2);
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={xField} stroke="#9CA3AF" fontSize={12} name={xField} />
              <YAxis dataKey={yField} stroke="#9CA3AF" fontSize={12} name={yField} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name={`${xField} vs ${yField}`} data={chartData} fill="#3B82F6" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'multi-line':
        const lineFields = availableFields.filter(f => f !== 'volume').slice(0, 4);
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {lineFields.map((field, idx) => (
                <Line key={field} type="monotone" dataKey={field} stroke={colors[idx % colors.length]} strokeWidth={2} dot={false} name={field} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'line-volume':
      case 'area-volume':
        const mainKey = availableFields.includes('close') ? 'close' : 'price';
        return (
          <div className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  {selectedChartType === 'area-volume' && (
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  )}
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} domain={['dataMin - 10', 'dataMax + 10']} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {selectedChartType === 'area-volume' ? (
                    <Area type="monotone" dataKey={mainKey} stroke="#3B82F6" fillOpacity={1} fill="url(#colorPrice)" name="Price" />
                  ) : (
                    <Line type="monotone" dataKey={mainKey} stroke="#3B82F6" strokeWidth={2} dot={false} name="Price" />
                  )}
                  {chartData.some(d => d.dma50) && <Line type="monotone" dataKey="dma50" stroke="#F59E0B" strokeWidth={1} dot={false} name="50 DMA" strokeDasharray="5 5" />}
                  {chartData.some(d => d.dma200) && <Line type="monotone" dataKey="dma200" stroke="#EF4444" strokeWidth={1} dot={false} name="200 DMA" strokeDasharray="5 5" />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="h-32">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Volume</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M`, "Volume"]} />
                  <Bar dataKey="volume" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'line':
      default:
        const defaultKey = availableFields.includes('close') ? 'close' : availableFields.includes('price') ? 'price' : availableFields[0];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={['dataMin - 10', 'dataMax + 10']} tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey={defaultKey} stroke="#3B82F6" strokeWidth={2} dot={false} name="Price" />
              {chartData.some(d => d.dma50) && <Line type="monotone" dataKey="dma50" stroke="#F59E0B" strokeWidth={1} dot={false} name="50 DMA" strokeDasharray="5 5" />}
              {chartData.some(d => d.dma200) && <Line type="monotone" dataKey="dma200" stroke="#EF4444" strokeWidth={1} dot={false} name="200 DMA" strokeDasharray="5 5" />}
            </ComposedChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <motion.div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none"
      layout
      layoutId={`widget-${widget.id}`}
      transition={{
        layout: { duration: 0.3, ease: "easeInOut" },
        opacity: { duration: 0.2 }
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Widget Header */}
      {!hideHeader && (
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <div>
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
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-mono">
                {stockSymbol}
              </span>
              {/* Real-time indicator */}
              {widget.enableRealtime && (
                <WidgetRealtimeIndicator
                  isConnected={realtimeResult.isConnected}
                  isError={realtimeResult.isError}
                  provider={widget.realtimeProvider || 'finnhub'}
                  lastUpdateTime={realtimeResult.lastUpdateTime}
                  compact={false}
                />
              )}
              {/* Show live data info when real-time is active */}
              {widget.enableRealtime && realtimeResult.isConnected && rollingStats && rollingStats.count > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded" title={`${rollingStats.count} seconds of data recorded`}>
                  {rollingStats.count}s recorded
                </span>
              )}
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
                  {Math.abs(priceChange.change).toFixed(2)}(
                  {isPositive ? "+" : ""}
                  {priceChange.percentage.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          {(isLoading || isFetching) && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
            CHART
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {/* Chart Type Selector */}
          <div className="relative">
            <button
              onClick={() => setShowChartMenu(!showChartMenu)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
              title="Change chart type"
            >
              <span className="capitalize">{chartOptions.find(opt => opt.id === selectedChartType)?.name || 'Chart'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showChartMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {/* Candlestick Charts */}
                {chartOptions.some(opt => opt.category === 'candlestick') && (
                  <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase px-2 py-1">
                      Candlestick Charts
                    </div>
                    {chartOptions.filter(opt => opt.category === 'candlestick').map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          hasUserSelectedChart.current = true;
                          setSelectedChartType(option.id);
                          setShowChartMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedChartType === option.id
                            ? 'bg-emerald-500 text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-medium">{option.name}</div>
                        <div className="text-xs opacity-75">{option.description}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Standard Charts */}
                {chartOptions.some(opt => opt.category === 'standard') && (
                  <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase px-2 py-1">
                      Standard Charts
                    </div>
                    {chartOptions.filter(opt => opt.category === 'standard').map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          hasUserSelectedChart.current = true;
                          setSelectedChartType(option.id);
                          setShowChartMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedChartType === option.id
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-medium">{option.name}</div>
                        <div className="text-xs opacity-75">{option.description}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Combined Charts */}
                {chartOptions.some(opt => opt.category === 'combined') && (
                  <div className="p-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase px-2 py-1">
                      Combined Charts
                    </div>
                    {chartOptions.filter(opt => opt.category === 'combined').map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          hasUserSelectedChart.current = true;
                          setSelectedChartType(option.id);
                          setShowChartMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedChartType === option.id
                            ? 'bg-purple-500 text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-medium">{option.name}</div>
                        <div className="text-xs opacity-75">{option.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
      )}

      {/* Chart Content */}
      <motion.div
        className="p-4"
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              className="text-red-400 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              Error: {error.message}
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <ChartSkeleton />
            </motion.div>
          ) : displayData.length > 0 ? (
            <motion.div
              key="chart"
              className={selectedChartType.includes('volume') ? 'space-y-0' : 'h-80'}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {renderChart()}
            </motion.div>
          ) : (

                    {/* Price Line */}
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      name="Price"
                    />

                    {/* Moving Averages - only show if data is available */}
                    {chartData.some(
                      (d: ChartDataPoint) => d.dma50 !== null && d.dma50 !== undefined
                    ) && (
                      <Line
                        type="monotone"
                        dataKey="dma50"
                        stroke="#F59E0B"
                        strokeWidth={1}
                        dot={false}
                        name="50 DMA"
                        strokeDasharray="5 5"
                      />
                    )}
                    {chartData.some(
                      (d: ChartDataPoint) => d.dma200 !== null && d.dma200 !== undefined
                    ) && (
                      <Line
                        type="monotone"
                        dataKey="dma200"
                        stroke="#EF4444"
                        strokeWidth={1}
                        dot={false}
                        name="200 DMA"
                        strokeDasharray="5 5"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Volume Chart - only show if volume data is available */}
              <AnimatePresence>
                {displayData.some((d: ChartDataPoint) => d.volume !== undefined && d.volume > 0) && (
                  <motion.div
                    className="h-32"
                    layout
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 128, marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <h4 className="text-sm font-medium text-slate-300 mb-2">
                      Volume
                    </h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={displayData}>
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
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                            return value.toFixed(2);
                          }}
                        />
                        <Tooltip
                          formatter={(value: number) => {
                            if (value >= 1000000) return [`${(value / 1000000).toFixed(2)}M`, "Volume"];
                            if (value >= 1000) return [`${(value / 1000).toFixed(2)}K`, "Volume"];
                            return [value.toFixed(4), "Volume"];
                          }}
                          labelStyle={{ color: "#9CA3AF" }}
                          contentStyle={{
                            backgroundColor: "#1F2937",
                            border: "1px solid #374151",
                          }}
                        />
                        <Bar dataKey="volume" fill="#6366F1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="no-data"
              className="text-center py-8 text-slate-400"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <p>No chart data available</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

const WidgetChart = React.memo(WidgetChartComponent, (prevProps, nextProps) => {
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.widget.title === nextProps.widget.title &&
    prevProps.widget.enableRealtime === nextProps.widget.enableRealtime &&
    prevProps.hideHeader === nextProps.hideHeader
  );
});

WidgetChart.displayName = 'WidgetChart';

export default WidgetChart;
