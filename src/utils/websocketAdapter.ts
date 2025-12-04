/**
 * WebSocket Adapter for Finnhub Real-Time Trade Data
 * Transforms Finnhub trade messages into common financial schema
 */

export interface FinnhubTrade {
  c?: number | null; // Conditions
  p: number; // Price
  s: string; // Symbol
  t: number; // Timestamp (milliseconds)
  v: number; // Volume
}

export interface RealtimeTradeData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  date: string;
  fullDate: string;
  provider: string;
  source: 'websocket';
}

export interface ChartDataPoint {
  date: string;
  fullDate: string;
  price: number;
  volume?: number;
  dma50?: number;
  dma200?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  receivedAt?: number; // Client timestamp when data was received (for queue management)
}

/**
 * Transform Finnhub trade data into common schema
 */
export function transformFinnhubTrade(trade: FinnhubTrade): RealtimeTradeData {
  const timestamp = trade.t;
  const date = new Date(timestamp);

  return {
    symbol: trade.s,
    price: trade.p,
    volume: trade.v,
    timestamp,
    date: date.toISOString().split('T')[0],
    fullDate: date.toISOString(),
    provider: 'finnhub',
    source: 'websocket',
  };
}

/**
 * Buffer that collects trades for 1 second, then emits aggregated data point
 * This provides a 1-second delay but ensures clean per-second readings
 */
export class SecondTradeBuffer {
  private buffer: RealtimeTradeData[] = [];
  private currentSecond: number = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  public onFlush: (point: ChartDataPoint) => void;
  private delayMs: number;
  private instanceId: string;

  constructor(onFlush: (point: ChartDataPoint) => void, delayMs: number = 1000) {
    this.onFlush = onFlush;
    this.delayMs = delayMs;
    this.instanceId = Math.random().toString(36).substring(7);
    console.log(`[SecondTradeBuffer ${this.instanceId}] Created with delay ${delayMs}ms`);
  }

  /**
   * Add a trade to the buffer
   */
  addTrade(trade: RealtimeTradeData): void {
    const tradeSecond = Math.floor(new Date(trade.fullDate).getTime() / 1000);

    // If this is a new second and we have buffered data, flush the old second
    if (this.currentSecond !== 0 && tradeSecond !== this.currentSecond && this.buffer.length > 0) {
      console.log(`[SecondTradeBuffer ${this.instanceId}] New second detected (${this.currentSecond} -> ${tradeSecond}), flushing ${this.buffer.length} trades`);
      this.flushBuffer();
    }

    // Update current second and add trade to buffer
    this.currentSecond = tradeSecond;
    this.buffer.push(trade);

    // Reset/set the timer - wait for delayMs after last trade to flush
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      console.log(`[SecondTradeBuffer ${this.instanceId}] Timer fired, flushing ${this.buffer.length} trades`);
      this.flushBuffer();
    }, this.delayMs);
  }

  /**
   * Flush the buffer - aggregate all trades and emit a single data point
   */
  private flushBuffer(): void {
    if (this.buffer.length === 0) {
      console.log(`[SecondTradeBuffer ${this.instanceId}] Flush called but buffer is empty`);
      return;
    }

    const trades = this.buffer;
    this.buffer = [];
    this.currentSecond = 0; // Reset current second after flush

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Aggregate trades into OHLCV
    const firstTrade = trades[0];
    const lastTrade = trades[trades.length - 1];
    const prices = trades.map(t => t.price);
    const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);

    const tradeTime = new Date(firstTrade.fullDate);
    const formatTimeDisplay = (date: Date) => {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    };

    const aggregatedPoint: ChartDataPoint = {
      date: formatTimeDisplay(tradeTime),
      fullDate: lastTrade.fullDate,
      price: lastTrade.price, // Use last price as the representative price
      volume: totalVolume,
      receivedAt: Date.now(),
      open: firstTrade.price,
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: lastTrade.price,
    };

    console.log(`[SecondTradeBuffer ${this.instanceId}] Flushing aggregated point:`, aggregatedPoint.date, 'from', trades.length, 'trades');
    this.onFlush(aggregatedPoint);
  }

  /**
   * Force flush any remaining data (e.g., on disconnect)
   */
  forceFlush(): void {
    console.log(`[SecondTradeBuffer ${this.instanceId}] Force flush called, buffer has ${this.buffer.length} trades`);
    this.flushBuffer();
  }

  /**
   * Clear buffer and timer
   */
  clear(): void {
    console.log(`[SecondTradeBuffer ${this.instanceId}] Clear called`);
    this.buffer = [];
    this.currentSecond = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Add a completed second data point to chart data
 * Used by SecondTradeBuffer after aggregating trades
 */
export function addSecondDataPoint(
  chartData: ChartDataPoint[],
  point: ChartDataPoint,
  maxDataPoints: number = 3600
): ChartDataPoint[] {
  const currentLength = chartData?.length || 0;
  
  if (!chartData || chartData.length === 0) {
    console.log(`[addSecondDataPoint] First point added. New length: 1`);
    return [point];
  }

  const newData = [...chartData, point];
  console.log(`[addSecondDataPoint] Added point. Previous: ${currentLength}, New: ${newData.length}`);

  // Limit to maxDataPoints
  if (newData.length > maxDataPoints) {
    const sliced = newData.slice(-maxDataPoints);
    console.log(`[addSecondDataPoint] Trimmed to max. Final length: ${sliced.length}`);
    return sliced;
  }

  return newData;
}

/**
 * Merge real-time trade data into existing chart data (LEGACY - direct mode)
 * Aggregates by SECOND - one data point per second, updates if same second
 * NOTE: For buffered/delayed mode, use SecondTradeBuffer instead
 * 
 * @param chartData - Existing chart data points
 * @param trade - New trade data to add
 * @param _timeWindowSeconds - UNUSED (kept for API compatibility)
 * @param maxDataPoints - Maximum data points to keep (fallback limit to prevent memory issues)
 */
export function mergeRealtimeTradeIntoChart(
  chartData: ChartDataPoint[],
  trade: RealtimeTradeData,
  _timeWindowSeconds: number = 60, // Unused - kept for API compatibility
  maxDataPoints: number = 3600 // Keep up to 1 hour of per-second data
): ChartDataPoint[] {
  const now = Date.now();
  const tradeTime = new Date(trade.fullDate);
  
  // Format time for display (HH:MM:SS) - this is the second key
  const formatTimeDisplay = (date: Date) => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };
  
  // Get second key for aggregation (truncate to second)
  const getSecondKey = (date: Date) => {
    return Math.floor(date.getTime() / 1000);
  };

  const currentSecondKey = getSecondKey(tradeTime);
  const currentSecondDisplay = formatTimeDisplay(tradeTime);

  if (!chartData || chartData.length === 0) {
    // First data point
    return [{
      date: currentSecondDisplay,
      fullDate: trade.fullDate,
      price: trade.price,
      volume: trade.volume,
      receivedAt: now,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
    }];
  }

  const lastPoint = chartData[chartData.length - 1];
  const lastSecondKey = lastPoint.receivedAt 
    ? Math.floor(lastPoint.receivedAt / 1000)
    : getSecondKey(new Date(lastPoint.fullDate));

  if (currentSecondKey === lastSecondKey) {
    // Same second - UPDATE the last point with OHLCV aggregation
    const newData = [...chartData];
    newData[newData.length - 1] = {
      ...lastPoint,
      date: currentSecondDisplay,
      fullDate: trade.fullDate,
      price: trade.price, // Latest price
      high: Math.max(lastPoint.high || lastPoint.price, trade.price),
      low: Math.min(lastPoint.low || lastPoint.price, trade.price),
      close: trade.price, // Close is latest
      volume: (lastPoint.volume || 0) + trade.volume,
      receivedAt: now,
    };
    return newData;
  } else {
    // New second - ADD new data point
    const newPoint: ChartDataPoint = {
      date: currentSecondDisplay,
      fullDate: trade.fullDate,
      price: trade.price,
      volume: trade.volume,
      receivedAt: now,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
    };

    const newData = [...chartData, newPoint];

    // Only limit if we exceed maxDataPoints to prevent memory issues
    if (newData.length > maxDataPoints) {
      return newData.slice(-maxDataPoints);
    }

    return newData;
  }
}

/**
 * Update chart data with latest price (for real-time indicator)
 * Does not add new data point, just updates the latest one
 */
export function updateChartLatestPrice(
  chartData: ChartDataPoint[],
  trade: RealtimeTradeData
): ChartDataPoint[] {
  if (!chartData || chartData.length === 0) {
    return chartData;
  }

  const newData = [...chartData];
  newData[newData.length - 1] = {
    ...newData[newData.length - 1],
    price: trade.price,
    volume: (newData[newData.length - 1].volume || 0) + trade.volume,
    fullDate: trade.fullDate,
  };

  return newData;
}

/**
 * Extract chart data points from multiple real-time trades
 */
export function extractChartDataFromTrades(trades: RealtimeTradeData[]): ChartDataPoint[] {
  return trades.map((trade) => ({
    date: trade.date,
    fullDate: trade.fullDate,
    price: trade.price,
    volume: trade.volume,
  }));
}

/**
 * Calculate recent statistics from trades
 */
export function calculateTradeStatistics(trades: RealtimeTradeData[]) {
  if (trades.length === 0) {
    return {
      latestPrice: 0,
      highPrice: 0,
      lowPrice: 0,
      totalVolume: 0,
      tradeCount: 0,
      priceChange: 0,
      priceChangePercent: 0,
    };
  }

  const prices = trades.map((t) => t.price);
  const latestPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const priceChange = latestPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;

  return {
    latestPrice,
    highPrice: Math.max(...prices),
    lowPrice: Math.min(...prices),
    totalVolume: trades.reduce((sum, t) => sum + t.volume, 0),
    tradeCount: trades.length,
    priceChange,
    priceChangePercent,
  };
}

/**
 * Format real-time data for CARD view display
 * Converts ChartDataPoint array to key-value pairs suitable for card display
 */
export function formatForCardView(chartData: ChartDataPoint[]) {
  if (!chartData || chartData.length === 0) {
    return {
      price: 'N/A',
      volume: 'N/A',
      time: 'N/A',
      date: 'N/A'
    };
  }

  const latest = chartData[chartData.length - 1];
  const previous = chartData.length > 1 ? chartData[chartData.length - 2] : latest;
  
  const priceChange = latest.price - previous.price;
  const priceChangePercent = previous.price !== 0 ? (priceChange / previous.price) * 100 : 0;

  return {
    price: latest.price,
    volume: latest.volume || 0,
    time: new Date(latest.fullDate).toLocaleTimeString(),
    date: latest.date,
    priceChange,
    priceChangePercent,
    high: latest.high || latest.price,
    low: latest.low || latest.price,
    open: latest.open || latest.price,
    close: latest.close || latest.price,
  };
}

/**
 * Format real-time data for TABLE view display
 * Converts ChartDataPoint array to table rows with all relevant fields
 */
export function formatForTableView(chartData: ChartDataPoint[], maxRows: number = 50): Array<Record<string, unknown>> {
  if (!chartData || chartData.length === 0) {
    return [];
  }

  // Take last N rows and reverse to show most recent first
  return chartData
    .slice(-maxRows)
    .reverse()
    .map((point, index) => {
      const time = new Date(point.fullDate);
      return {
        '#': maxRows - index,
        time: time.toLocaleTimeString(),
        date: point.date,
        price: point.price,
        volume: point.volume || 0,
        open: point.open || point.price,
        high: point.high || point.price,
        low: point.low || point.price,
        close: point.close || point.price,
        timestamp: time.getTime(),
      };
    });
}

/**
 * Format real-time data for CHART view display
 * Works with individual trade data points (queue-based)
 * Each point represents a single trade for live visualization
 */
export function formatForChartView(chartData: ChartDataPoint[], maxPoints: number = 100): ChartDataPoint[] {
  if (!chartData || chartData.length === 0) {
    return [];
  }

  // Take last N points and ensure proper structure
  return chartData
    .slice(-maxPoints)
    .map(point => {
      // Date should already be in HH:MM:SS format from mergeRealtimeTradeIntoChart
      // If not, format it
      let displayDate = point.date;
      if (point.fullDate && (!point.date || !point.date.includes(':'))) {
        const d = new Date(point.fullDate);
        displayDate = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      }

      return {
        ...point,
        date: displayDate,
      };
    });
}

/**
 * Get statistics for the current rolling window of trades
 * Uses receivedAt timestamp for accurate window duration calculation
 */
export function getRollingWindowStats(chartData: ChartDataPoint[]) {
  if (!chartData || chartData.length === 0) {
    return {
      count: 0,
      highPrice: 0,
      lowPrice: 0,
      avgPrice: 0,
      totalVolume: 0,
      latestPrice: 0,
      priceRange: 0,
      windowDurationMs: 0,
      windowDurationSec: 0,
    };
  }

  const prices = chartData.map(p => p.price);
  const highPrice = Math.max(...prices);
  const lowPrice = Math.min(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const totalVolume = chartData.reduce((sum, p) => sum + (p.volume || 0), 0);
  const latestPrice = prices[prices.length - 1];
  
  // Calculate actual time window covered using receivedAt (client time)
  // This is more accurate than trade timestamps which can be delayed
  const getReceivedTime = (point: ChartDataPoint) => 
    point.receivedAt || new Date(point.fullDate).getTime();
  
  const oldestTime = getReceivedTime(chartData[0]);
  const newestTime = getReceivedTime(chartData[chartData.length - 1]);
  const windowDurationMs = newestTime - oldestTime;

  return {
    count: chartData.length,
    highPrice,
    lowPrice,
    avgPrice,
    totalVolume,
    latestPrice,
    priceRange: highPrice - lowPrice,
    windowDurationMs,
    windowDurationSec: Math.round(windowDurationMs / 1000),
  };
}

/**
 * Buffer trades and emit when size is reached or timeout occurs
 */
export class TradeBuffer {
  private buffer: RealtimeTradeData[] = [];
  private bufferSize: number;
  private flushInterval: NodeJS.Timeout | null = null;
  private flushIntervalMs: number;
  private onFlush: (trades: RealtimeTradeData[]) => void;

  constructor(bufferSize: number = 10, flushIntervalMs: number = 500, onFlush: (trades: RealtimeTradeData[]) => void) {
    this.bufferSize = bufferSize;
    this.flushIntervalMs = flushIntervalMs;
    this.onFlush = onFlush;

    // Set up periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, flushIntervalMs);
  }

  /**
   * Add trade to buffer
   */
  add(trade: RealtimeTradeData): void {
    this.buffer.push(trade);

    // Flush if buffer size reached
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  /**
   * Flush buffered trades
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const trades = this.buffer;
    this.buffer = [];
    this.onFlush(trades);
  }

  /**
   * Clear buffer and cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.buffer = [];
  }
}
