/**
 * Hook for managing real-time WebSocket data integration with widget data
 * Merges real-time updates with polling data seamlessly
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Widget } from '../types/widget';
import { websocketManager, type WebSocketProvider } from '../utils/websocketManager';
import { transformFinnhubTrade, addSecondDataPoint, ChartDataPoint } from '../utils/websocketAdapter';
import { useStore } from '../store/useStore';

// Global map to store per-second aggregated data outside React lifecycle
// Key: widgetId, Value: { currentSecond, trades, timer, chartData }
interface WidgetSecondBuffer {
  currentSecond: number;
  trades: Array<{ price: number; volume: number; fullDate: string }>;
  timer: ReturnType<typeof setTimeout> | null;
  chartData: ChartDataPoint[];
}

const widgetBuffers = new Map<string, WidgetSecondBuffer>();

function getOrCreateBuffer(widgetId: string): WidgetSecondBuffer {
  if (!widgetBuffers.has(widgetId)) {
    widgetBuffers.set(widgetId, {
      currentSecond: 0,
      trades: [],
      timer: null,
      chartData: [],
    });
  }
  return widgetBuffers.get(widgetId)!;
}

function clearWidgetBuffer(widgetId: string): void {
  const buffer = widgetBuffers.get(widgetId);
  if (buffer) {
    if (buffer.timer) {
      clearTimeout(buffer.timer);
    }
    widgetBuffers.delete(widgetId);
  }
}

export interface UseRealtimeDataOptions {
  enableRealtime?: boolean;
  provider?: 'finnhub' | 'custom';
  symbol?: string;
  onDataUpdate?: (data: ChartDataPoint[]) => void;
  bufferDelayMs?: number; // Delay in ms before flushing buffered trades (default 1000ms)
  bufferSize?: number;
}

export interface UseRealtimeDataResult {
  isConnected: boolean;
  isError: boolean;
  errorMessage?: string;
  realtimeData: ChartDataPoint[];
  lastUpdateTime: number | null;
  retryCount: number;
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'error';
  connect: () => Promise<void>;
  disconnect: () => void;
  clearData: () => void;
  retry: () => Promise<void>;
}

/**
 * Hook to manage real-time WebSocket connections and data updates
 */
export const useRealtimeData = (
  widget: Widget,
  initialData: ChartDataPoint[] = [],
  options: UseRealtimeDataOptions = {}
): UseRealtimeDataResult => {
  const {
    enableRealtime = widget.enableRealtime || false,
    provider = widget.realtimeProvider || 'finnhub',
    symbol = widget.realtimeSymbol || extractSymbolFromWidget(widget),
    onDataUpdate,
    bufferDelayMs = 1000, // Default: 1 second buffer delay
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [realtimeData, setRealtimeData] = useState<ChartDataPoint[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Force update trigger
  const [, forceUpdate] = useState(0);

  const subscriptionRef = useRef(false);
  const mountedRef = useRef(true);
  const hasConnectedOnceRef = useRef(false);

  const websocketSymbolsKey = useMemo(
    () => JSON.stringify(widget.websocketSymbols ?? []),
    [widget.websocketSymbols]
  );

  const normalizedSymbols = useMemo(() => {
    const parsedSymbols = JSON.parse(websocketSymbolsKey) as string[];
    if (parsedSymbols.length > 0) {
      return parsedSymbols;
    }
    return widget.realtimeSymbol ? [widget.realtimeSymbol] : [];
  }, [websocketSymbolsKey, widget.realtimeSymbol]);

  // Store refs to avoid stale closures in callbacks
  const normalizedSymbolsRef = useRef(normalizedSymbols);
  normalizedSymbolsRef.current = normalizedSymbols;

  // Store state management
  const initRealtimeWidget = useStore((state) => state.initRealtimeWidget);
  const setRealtimeConnected = useStore((state) => state.setRealtimeConnected);
  const updateRealtimeData = useStore((state) => state.updateRealtimeData);
  
  // Store callback refs
  const onDataUpdateRef = useRef(onDataUpdate);
  onDataUpdateRef.current = onDataUpdate;
  
  const updateRealtimeDataRef = useRef(updateRealtimeData);
  updateRealtimeDataRef.current = updateRealtimeData;
  
  const setRealtimeDataRef = useRef(setRealtimeData);
  setRealtimeDataRef.current = setRealtimeData;
  
  const setLastUpdateTimeRef = useRef(setLastUpdateTime);
  setLastUpdateTimeRef.current = setLastUpdateTime;

  // Function to flush buffer and update React state
  const flushBufferToState = useCallback((widgetId: string) => {
    const buffer = widgetBuffers.get(widgetId);
    if (!buffer || buffer.trades.length === 0) return;

    const trades = buffer.trades;
    buffer.trades = [];
    buffer.currentSecond = 0;
    
    if (buffer.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = null;
    }

    // Aggregate trades into OHLCV
    const firstTrade = trades[0];
    const lastTrade = trades[trades.length - 1];
    const prices = trades.map(t => t.price);
    const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);

    const tradeTime = new Date(firstTrade.fullDate);
    const timeStr = `${String(tradeTime.getHours()).padStart(2, '0')}:${String(tradeTime.getMinutes()).padStart(2, '0')}:${String(tradeTime.getSeconds()).padStart(2, '0')}`;

    const aggregatedPoint: ChartDataPoint = {
      date: timeStr,
      fullDate: lastTrade.fullDate,
      price: lastTrade.price,
      volume: totalVolume,
      receivedAt: Date.now(),
      open: firstTrade.price,
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: lastTrade.price,
    };

    // Add to chart data
    buffer.chartData = addSecondDataPoint(buffer.chartData, aggregatedPoint);
    
    console.log(`[flushBufferToState] Widget ${widgetId}: Flushed ${trades.length} trades for ${timeStr}. Total points: ${buffer.chartData.length}`);

    // Update React state
    if (mountedRef.current) {
      setRealtimeDataRef.current(buffer.chartData);
      setLastUpdateTimeRef.current(Date.now());
      updateRealtimeDataRef.current(widgetId, buffer.chartData);
      onDataUpdateRef.current?.(buffer.chartData);
    }
  }, []);

  // Initialize store on mount
  useEffect(() => {
    if (enableRealtime && symbol && provider) {
      initRealtimeWidget(widget.id, provider);
    }
  }, [widget.id, enableRealtime, symbol, provider, initRealtimeWidget]);

  // Track mount state and sync buffer data on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Restore data from global buffer if exists
    const buffer = widgetBuffers.get(widget.id);
    if (buffer && buffer.chartData.length > 0) {
      setRealtimeData(buffer.chartData);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [widget.id]);

  // Handle incoming real-time data
  const handleRealtimeMessage = useCallback(
    (trade: Record<string, unknown>) => {
      if (!mountedRef.current) return;
      
      try {
        if (trade.provider === 'finnhub') {
          const transformed = transformFinnhubTrade(trade as unknown as { p: number; v: number; s: string; t: number });

          // Check if this trade is for a symbol we're interested in
          const subscribedSymbols = normalizedSymbolsRef.current;
          const isSubscribedSymbol = subscribedSymbols.includes(transformed.symbol);

          if (isSubscribedSymbol) {
            const buffer = getOrCreateBuffer(widget.id);
            const tradeSecond = Math.floor(new Date(transformed.fullDate).getTime() / 1000);

            // If new second and we have data, flush old second first
            if (buffer.currentSecond !== 0 && tradeSecond !== buffer.currentSecond && buffer.trades.length > 0) {
              console.log(`[handleRealtimeMessage] New second detected (${buffer.currentSecond} -> ${tradeSecond}), flushing`);
              flushBufferToState(widget.id);
            }

            // Add trade to buffer
            buffer.currentSecond = tradeSecond;
            buffer.trades.push({
              price: transformed.price,
              volume: transformed.volume,
              fullDate: transformed.fullDate,
            });

            // Reset timer
            if (buffer.timer) {
              clearTimeout(buffer.timer);
            }
            buffer.timer = setTimeout(() => {
              console.log(`[handleRealtimeMessage] Timer fired for widget ${widget.id}`);
              flushBufferToState(widget.id);
            }, bufferDelayMs);
            
            setIsError(false);
            setErrorMessage(undefined);
          }
        }
      } catch (error) {
        console.error('Error processing real-time trade:', error);
        setIsError(true);
        setErrorMessage(`Failed to process trade: ${(error as Error).message}`);
      }
    },
    [widget.id, bufferDelayMs, flushBufferToState]
  );

  // Handle connection changes - stable callback
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      if (!mountedRef.current) return;
      
      setIsConnected(connected);
      setRealtimeConnected(widget.id, connected);

      if (connected) {
        setIsError(false);
        setErrorMessage(undefined);
        setRetryCount(0);
      }
    },
    [widget.id, setRealtimeConnected]
  );

  // Handle errors - stable callback
  const handleError = useCallback(
    (error: Error) => {
      if (!mountedRef.current) return;
      
      console.error('Real-time connection error:', error);
      setIsError(true);
      setErrorMessage(error.message);
      setRetryCount((count) => count + 1);
    },
    []
  );

  // Connect to WebSocket - only runs once per mount
  const connect = useCallback(async () => {
    // Prevent duplicate connections
    if (!enableRealtime || !provider || subscriptionRef.current || hasConnectedOnceRef.current) {
      console.log('useRealtimeData: Skipping connect - enableRealtime:', enableRealtime, 'provider:', provider, 'alreadySubscribed:', subscriptionRef.current, 'hasConnectedOnce:', hasConnectedOnceRef.current);
      return;
    }

    const symbolsToSubscribe = normalizedSymbolsRef.current;
    console.log('useRealtimeData: Connecting to WebSocket for widget:', widget.id, 'symbols:', symbolsToSubscribe);

    if (symbolsToSubscribe.length === 0) {
      console.error('useRealtimeData: No symbols to subscribe');
      setIsError(true);
      setErrorMessage('No WebSocket symbols configured for this widget.');
      return;
    }

    try {
      subscriptionRef.current = true;
      hasConnectedOnceRef.current = true;
      setIsError(false);
      setErrorMessage(undefined);

      // Initialize WebSocket manager if not already initialized
      if (!websocketManager['config']) {
        // Priority: widget.websocketUrl > env variable > no default (require user input)
        let websocketUrl = widget.websocketUrl;
        
        if (!websocketUrl) {
          const envToken = process.env.NEXT_PUBLIC_FINNHUB_TOKEN;
          if (envToken) {
            websocketUrl = `wss://ws.finnhub.io?token=${envToken}`;
          } else {
            // No URL or token available - this should be configured in the widget
            console.error('useRealtimeData: No WebSocket URL or Finnhub token configured');
            setIsError(true);
            setErrorMessage('No Finnhub API token configured.\n\nPlease configure a WebSocket URL with your API token in the widget settings.\n\nGet a free API key at: https://finnhub.io');
            subscriptionRef.current = false;
            return;
          }
        }
        
        // Validate token length (Finnhub tokens are ~20 chars)
        const tokenMatch = websocketUrl.match(/token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          if (token.length > 30) {
            console.warn(`useRealtimeData: API token appears too long (${token.length} chars). Typical Finnhub tokens are ~20 characters.`);
          }
        }
        
        console.log('useRealtimeData: Initializing WebSocket manager with URL:', websocketUrl.split('?')[0] + '?token=***');
        websocketManager.initialize({
          url: websocketUrl,
          provider: provider as WebSocketProvider,
        });
      }

      console.log('useRealtimeData: Subscribing to symbols:', symbolsToSubscribe);

      for (const sym of symbolsToSubscribe) {
        console.log('useRealtimeData: Subscribing to symbol:', sym);
        await websocketManager.subscribe({
          symbol: sym,
          provider: provider as WebSocketProvider,
          onMessage: handleRealtimeMessage,
          onError: handleError,
          onConnectionChange: handleConnectionChange,
        });
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsError(true);
      setErrorMessage((error as Error).message);
      subscriptionRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableRealtime, provider, widget.id, widget.websocketUrl]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (subscriptionRef.current && provider) {
      const symbolsToUnsubscribe = normalizedSymbolsRef.current;

      symbolsToUnsubscribe.forEach(sym => {
        websocketManager.unsubscribe(sym, provider as WebSocketProvider);
      });

      subscriptionRef.current = false;
      setIsConnected(false);
    }
  }, [provider]);

  // Clear data
  const clearData = useCallback(() => {
    const buffer = widgetBuffers.get(widget.id);
    if (buffer) {
      buffer.chartData = [];
      buffer.trades = [];
      buffer.currentSecond = 0;
      if (buffer.timer) {
        clearTimeout(buffer.timer);
        buffer.timer = null;
      }
    }
    setRealtimeData([]);
    setLastUpdateTime(null);
  }, [widget.id]);

  // Cleanup on unmount - run connect only once
  useEffect(() => {
    if (enableRealtime && provider && !hasConnectedOnceRef.current) {
      connect();
    }

    return () => {
      if (subscriptionRef.current) {
        disconnect();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableRealtime, provider]);

  // Retry connection after failure
  const retry = useCallback(async () => {
    console.log('useRealtimeData: Retrying connection...');
    
    // Reset state
    hasConnectedOnceRef.current = false;
    subscriptionRef.current = false;
    setIsError(false);
    setErrorMessage(undefined);
    setRetryCount(0);
    
    // Reset WebSocket manager state
    if (provider) {
      websocketManager.resetReconnectAttempts(provider as WebSocketProvider);
    }
    
    // Try to connect again
    await connect();
  }, [provider, connect]);

  // Derive connection state for UI
  const connectionState = isError 
    ? 'error' 
    : isConnected 
      ? 'connected' 
      : hasConnectedOnceRef.current 
        ? 'reconnecting' 
        : 'connecting';

  return {
    isConnected,
    isError,
    errorMessage,
    realtimeData,
    lastUpdateTime,
    retryCount,
    connectionState,
    connect,
    disconnect,
    clearData,
    retry,
  };
};

/**
 * Extract symbol from widget configuration or API URL
 */
function extractSymbolFromWidget(widget: Widget): string {
  // Check explicit realtimeSymbol (legacy single symbol)
  if (widget.realtimeSymbol) {
    return widget.realtimeSymbol;
  }

  // Check websocketSymbols for multiple symbols (use first one for now)
  if (widget.websocketSymbols && widget.websocketSymbols.length > 0) {
    return widget.websocketSymbols[0];
  }

  // Try to extract from API URL
  if (widget.apiUrl) {
    // Handle URLs like: /api/stock/AAPL or ?symbol=AAPL
    const match = widget.apiUrl.match(/(?:\/|symbol=)([A-Z0-9:]{1,20})(?:[/?&]|$)/i);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  // Try selected fields
  if (widget.selectedFields && widget.selectedFields.length > 0) {
    const firstField = widget.selectedFields[0];
    // Check if it looks like a symbol
    if (/^[A-Z0-9:]{1,20}$/.test(firstField)) {
      return firstField;
    }
  }

  return '';
}

/**
 * Hook to merge real-time data with polling data
 */
export const useMergedWidgetData = (
  pollingData: ChartDataPoint[] = [],
  realtimeData: ChartDataPoint[] = [],
  preferRealtime: boolean = true
) => {
  return preferRealtime && realtimeData.length > 0 ? realtimeData : pollingData;
};

/**
 * Hook to track real-time connection status across multiple widgets
 */
export const useRealtimeConnectionStatus = () => {
  const realtimeStates = useStore((state) => state.realtimeStates);

  const connectedCount = Object.values(realtimeStates).filter((state) => state.isConnected).length;
  const totalCount = Object.values(realtimeStates).length;

  return {
    connectedCount,
    totalCount,
    allConnected: connectedCount === totalCount && totalCount > 0,
    anyConnected: connectedCount > 0,
    states: realtimeStates,
  };
};
