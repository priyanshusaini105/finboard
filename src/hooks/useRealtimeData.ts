/**
 * Hook for managing real-time WebSocket data integration with widget data
 * Merges real-time updates with polling data seamlessly
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Widget } from '../types/widget';
import { websocketManager, type WebSocketProvider } from '../utils/websocketManager';
import { transformFinnhubTrade, mergeRealtimeTradeIntoChart, ChartDataPoint } from '../utils/websocketAdapter';
import { useStore } from '../store/useStore';

export interface UseRealtimeDataOptions {
  enableRealtime?: boolean;
  provider?: 'finnhub' | 'custom';
  symbol?: string;
  onDataUpdate?: (data: ChartDataPoint[]) => void;
  aggregateByMinute?: boolean;
  bufferSize?: number;
}

export interface UseRealtimeDataResult {
  isConnected: boolean;
  isError: boolean;
  errorMessage?: string;
  realtimeData: ChartDataPoint[];
  lastUpdateTime: number | null;
  retryCount: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearData: () => void;
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
    aggregateByMinute = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [realtimeData, setRealtimeData] = useState<ChartDataPoint[]>(initialData);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const dataRef = useRef<ChartDataPoint[]>(initialData);
  const subscriptionRef = useRef(false);

  // Store state management
  const initRealtimeWidget = useStore((state) => state.initRealtimeWidget);
  const setRealtimeConnected = useStore((state) => state.setRealtimeConnected);
  const updateRealtimeData = useStore((state) => state.updateRealtimeData);

  // Initialize store on mount
  useEffect(() => {
    if (enableRealtime && symbol && provider) {
      initRealtimeWidget(widget.id, provider);
    }
  }, [widget.id, enableRealtime, symbol, provider, initRealtimeWidget]);

  // Handle incoming real-time data
  const handleRealtimeMessage = useCallback(
    (trade: Record<string, unknown>) => {
      console.log('useRealtimeData: Received trade message:', trade);
      try {
        if (trade.provider === 'finnhub') {
          const transformed = transformFinnhubTrade(trade);

          // Check if this trade is for a symbol we're interested in
          const subscribedSymbols = widget.websocketSymbols || (widget.realtimeSymbol ? [widget.realtimeSymbol] : []);
          const isSubscribedSymbol = subscribedSymbols.includes(transformed.symbol);

          if (isSubscribedSymbol) {
            const chartPoint: ChartDataPoint = {
              date: transformed.date,
              fullDate: transformed.fullDate,
              price: transformed.price,
              volume: transformed.volume,
            };

            // Merge with existing data
            const updated = mergeRealtimeTradeIntoChart(dataRef.current, transformed, aggregateByMinute);
            dataRef.current = updated;
            setRealtimeData(updated);
            setLastUpdateTime(Date.now());
            setIsError(false);
            setErrorMessage(undefined);

            // Update store
            updateRealtimeData(widget.id, updated);

            // Notify parent
            onDataUpdate?.(updated);
          }
        }
      } catch (error) {
        console.error('Error processing real-time trade:', error);
        setIsError(true);
        setErrorMessage(`Failed to process trade: ${(error as Error).message}`);
      }
    },
    [widget.id, widget.websocketSymbols, widget.realtimeSymbol, aggregateByMinute, updateRealtimeData, onDataUpdate]
  );

  // Handle connection changes
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
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

  // Handle errors
  const handleError = useCallback(
    (error: Error) => {
      console.error('Real-time connection error:', error);
      setIsError(true);
      setErrorMessage(error.message);
      setRetryCount((count) => count + 1);
    },
    []
  );

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!enableRealtime || !provider || subscriptionRef.current) {
      console.log('useRealtimeData: Skipping connect - enableRealtime:', enableRealtime, 'provider:', provider, 'subscriptionRef:', subscriptionRef.current);
      return;
    }

    console.log('useRealtimeData: Connecting to WebSocket for widget:', widget.id, 'symbols:', widget.websocketSymbols || widget.realtimeSymbol);

    try {
      subscriptionRef.current = true;
      setIsError(false);
      setErrorMessage(undefined);

      // Initialize WebSocket manager if not already initialized
      if (!websocketManager['config']) {
        let websocketUrl = widget.websocketUrl || `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_TOKEN || 'demo'}`;
        let token = process.env.NEXT_PUBLIC_FINNHUB_TOKEN || 'demo';

        // Extract token from URL if present
        const tokenMatch = websocketUrl.match(/token=([^&\s]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
          // Remove token from URL for proper formatting
          websocketUrl = websocketUrl.replace(/\?token=[^&\s]+/, '').replace(/&token=[^&\s]+/, '');
          if (!websocketUrl.includes('?') && !websocketUrl.includes('&')) {
            websocketUrl = 'wss://ws.finnhub.io';
          }
        }

        console.log('useRealtimeData: Initializing WebSocket manager with URL:', websocketUrl, 'token:', token);
        websocketManager.initialize({
          url: websocketUrl,
          token,
          provider: provider as WebSocketProvider,
        });
      }

      // Subscribe to all symbols for this widget
      const symbolsToSubscribe = widget.websocketSymbols || (widget.realtimeSymbol ? [widget.realtimeSymbol] : []);
      console.log('useRealtimeData: Subscribing to symbols:', symbolsToSubscribe);

      for (const symbol of symbolsToSubscribe) {
        console.log('useRealtimeData: Subscribing to symbol:', symbol);
        await websocketManager.subscribe({
          symbol,
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
  }, [enableRealtime, provider, handleRealtimeMessage, handleError, handleConnectionChange, widget.websocketUrl, widget.websocketSymbols, widget.realtimeSymbol, widget.id]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (subscriptionRef.current && provider) {
      // Unsubscribe from all symbols for this widget
      const symbolsToUnsubscribe = widget.websocketSymbols || (widget.realtimeSymbol ? [widget.realtimeSymbol] : []);

      symbolsToUnsubscribe.forEach(symbol => {
        websocketManager.unsubscribe(symbol, provider as WebSocketProvider);
      });

      subscriptionRef.current = false;
      setIsConnected(false);
      handleConnectionChange(false);
    }
  }, [provider, widget.websocketSymbols, widget.realtimeSymbol, handleConnectionChange]);

  // Clear data
  const clearData = useCallback(() => {
    dataRef.current = [];
    setRealtimeData([]);
    setLastUpdateTime(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    if (enableRealtime && provider) {
      connect();
    }

    return () => {
      if (subscriptionRef.current) {
        disconnect();
      }
    };
  }, [enableRealtime, provider, connect, disconnect]);

  // Update initial data when it changes
  useEffect(() => {
    dataRef.current = initialData;
    if (realtimeData.length === 0) {
      setRealtimeData(initialData);
    }
  }, [initialData, realtimeData.length]);

  return {
    isConnected,
    isError,
    errorMessage,
    realtimeData,
    lastUpdateTime,
    retryCount,
    connect,
    disconnect,
    clearData,
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
