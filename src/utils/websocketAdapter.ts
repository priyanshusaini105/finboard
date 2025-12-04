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
 * Merge real-time trade data into existing chart data
 * Keeps chart data structure while updating latest price and volume
 */
export function mergeRealtimeTradeIntoChart(
  chartData: ChartDataPoint[],
  trade: RealtimeTradeData,
  aggregateByMinute: boolean = false
): ChartDataPoint[] {
  if (!chartData || chartData.length === 0) {
    // If no existing data, create initial entry
    return [
      {
        date: trade.date,
        fullDate: trade.fullDate,
        price: trade.price,
        volume: trade.volume,
      },
    ];
  }

  const lastDataPoint = chartData[chartData.length - 1];
  const newData = [...chartData];

  if (aggregateByMinute) {
    // Check if trade is from the same minute as the last data point
    const lastTime = new Date(lastDataPoint.fullDate);
    const tradeTime = new Date(trade.fullDate);

    const sameMinute =
      lastTime.getFullYear() === tradeTime.getFullYear() &&
      lastTime.getMonth() === tradeTime.getMonth() &&
      lastTime.getDate() === tradeTime.getDate() &&
      lastTime.getHours() === tradeTime.getHours() &&
      lastTime.getMinutes() === tradeTime.getMinutes();

    if (sameMinute) {
      // Merge with last data point (update price, aggregate volume)
      newData[newData.length - 1] = {
        ...lastDataPoint,
        price: trade.price, // Use latest price
        volume: (lastDataPoint.volume || 0) + trade.volume, // Aggregate volume
        fullDate: trade.fullDate, // Update timestamp
      };
    } else {
      // New minute, add as new data point
      newData.push({
        date: trade.date,
        fullDate: trade.fullDate,
        price: trade.price,
        volume: trade.volume,
      });
    }
  } else {
    // Add each trade as individual data point
    newData.push({
      date: trade.date,
      fullDate: trade.fullDate,
      price: trade.price,
      volume: trade.volume,
    });
  }

  return newData;
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
