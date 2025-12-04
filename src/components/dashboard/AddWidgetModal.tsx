"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WidgetConfig, Widget } from "@/src/types";
import { transformApiData, shouldTransformApi, type ColumnDefinition, parseUrlParams, reconstructUrl, type UrlParam } from "@/src/utils";
import { useApiTesting } from "@/src/hooks";
import { HeaderInput, DisplaySettings, FieldSelector, UrlParamsInput } from ".";

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (config: WidgetConfig) => void;
  editingWidget?: Widget | null;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.95, opacity: 0, y: 20 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.03 },
  }),
};

export default function AddWidgetModal({
  isOpen,
  onClose,
  onAddWidget,
  editingWidget,
}: AddWidgetModalProps) {
  const [widgetName, setWidgetName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [urlParams, setUrlParams] = useState<UrlParam[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [displayMode, setDisplayMode] = useState<"card" | "table" | "chart">(
    "card"
  );
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [enableRealtime, setEnableRealtime] = useState(false);
  const [websocketUrl, setWebsocketUrl] = useState("");
  const [liveTradeData, setLiveTradeData] = useState<{ s: string; p: number; v: number; t: number }[]>([]);
  const [isConnectingWebsocket, setIsConnectingWebsocket] = useState(false);
  const [websocketError, setWebsocketError] = useState("");
  const [isWebsocketConnected, setIsWebsocketConnected] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [customSymbol, setCustomSymbol] = useState("");
  const [showRealtimePanel, setShowRealtimePanel] = useState(false);
  const [realtimeSymbol, setRealtimeSymbol] = useState("");

  const {
    isTestingApi,
    apiFields,
    apiTestSuccess,
    apiError,
    testApiConnection: performApiTest,
    setApiFields,
    setApiTestSuccess,
    setApiError,
  } = useApiTesting();

  // Close WebSocket connection when modal closes
  useEffect(() => {
    return () => {
      // Cleanup WebSocket on unmount or modal close
      if (websocketUrl) {
        try {
          const ws = new WebSocket(websocketUrl);
          ws.addEventListener("open", () => {
            // Unsubscribe from all symbols
            selectedSymbols.forEach((symbol) => {
              ws.send(JSON.stringify({ type: "unsubscribe", symbol }));
            });
            ws.close();
          });
        } catch {
          console.log("WebSocket cleanup completed");
        }
      }
    };
  }, [websocketUrl, selectedSymbols, isOpen]);

  useEffect(() => {
     
    if (!isOpen) {
      setWidgetName("");
      setApiUrl("");
      setUrlParams([]);
      setRefreshInterval(30);
      setDisplayMode("card");
      setSelectedFields([]);
      setHeaders({});
      setCurrentPage(1);
      setApiFields([]);
      setApiTestSuccess(false);
      setApiError("");
      setEnableRealtime(false);
      setWebsocketUrl("");
      setLiveTradeData([]);
      setIsConnectingWebsocket(false);
      setWebsocketError("");
      setIsWebsocketConnected(false);
      setSelectedSymbols([]);
      setCustomSymbol("");
      setShowRealtimePanel(false);
    } else if (editingWidget) {
      setWidgetName(editingWidget.title);
      setApiUrl(editingWidget.apiUrl || "");
      const { params } = parseUrlParams(editingWidget.apiUrl || "");
      setUrlParams(params);
      setRefreshInterval(editingWidget.refreshInterval);
      setDisplayMode(
        editingWidget.type === "card"
          ? "card"
          : editingWidget.type === "table"
          ? "table"
          : "chart"
      );
      setSelectedFields(editingWidget.selectedFields || []);
      setHeaders(editingWidget.headers || {});
      setCurrentPage(1);
      setEnableRealtime(editingWidget.enableRealtime || false);
      setWebsocketUrl(editingWidget.websocketUrl || "");
      setSelectedSymbols(editingWidget.websocketSymbols || []);
      setLiveTradeData([]);
      setIsConnectingWebsocket(false);
      setWebsocketError("");
      setIsWebsocketConnected(false);
      setCustomSymbol("");
      setShowRealtimePanel(false);
    } else {
      // Reset for creating new widget
      setWidgetName("");
      setApiUrl("");
      setUrlParams([]);
      setRefreshInterval(30);
      setDisplayMode("card");
      setSelectedFields([]);
      setHeaders({});
      setCurrentPage(1);
      setApiFields([]);
      setApiTestSuccess(false);
      setApiError("");
    }
  }, [isOpen, editingWidget, setApiFields, setApiTestSuccess, setApiError]);


  const handleFieldToggle = useCallback((fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  }, []);

  const handleUrlParamsChange = (newParams: UrlParam[]) => {
    setUrlParams(newParams);
    const { baseUrl } = parseUrlParams(apiUrl);
    const newUrl = reconstructUrl(baseUrl, newParams);
    setApiUrl(newUrl);
  };

  const handleApiUrlChange = (url: string) => {
    setApiUrl(url);
    const { params } = parseUrlParams(url);
    setUrlParams(params);
  };

  const testWebsocketConnection = useCallback(() => {
    if (!websocketUrl) {
      setWebsocketError("Please enter a WebSocket URL");
      return;
    }

    if (selectedSymbols.length === 0) {
      setWebsocketError("Please select at least one symbol");
      return;
    }

    setIsConnectingWebsocket(true);
    setWebsocketError("");
    setLiveTradeData([]);

    try {
      const ws = new WebSocket(websocketUrl);
      let tradeCount = 0;
      const timeout = setTimeout(() => {
        ws.close();
        if (tradeCount === 0) {
          setWebsocketError("Timeout: No data received. Check your token and internet connection.");
          setIsConnectingWebsocket(false);
        }
      }, 8000);

      ws.addEventListener("open", () => {
        console.log("WebSocket connected, subscribing to symbols...");
        // Subscribe to all selected symbols
        selectedSymbols.forEach((symbol) => {
          ws.send(JSON.stringify({ type: "subscribe", symbol }));
          console.log(`Subscribed to ${symbol}`);
        });
      });

      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "trade" && data.data) {
            tradeCount++;
            setLiveTradeData((prev) => [
              ...prev,
              ...data.data.map((trade: { s: string; p: number; v: number; t: number }) => ({
                ...trade,
                receivedAt: new Date().toLocaleTimeString(),
              })),
            ]);

            // Close after receiving some trades
            if (tradeCount >= 3) {
              clearTimeout(timeout);
              // Unsubscribe from all symbols
              selectedSymbols.forEach((symbol) => {
                ws.send(JSON.stringify({ type: "unsubscribe", symbol }));
              });
              ws.close();
              setIsWebsocketConnected(true);
              setIsConnectingWebsocket(false);
            }
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      });

      ws.addEventListener("error", () => {
        clearTimeout(timeout);
        setWebsocketError("WebSocket connection error. Check your token and URL.");
        setIsConnectingWebsocket(false);
      });

      ws.addEventListener("close", () => {
        clearTimeout(timeout);
      });
    } catch (error) {
      setWebsocketError(`Error: ${(error as Error).message}`);
      setIsConnectingWebsocket(false);
    }
  }, [websocketUrl, selectedSymbols]);

  const handleNextStep = useCallback(async () => {
    // For WebSocket widgets, skip API testing and go directly to step 2
    if (enableRealtime) {
      if (!websocketUrl || selectedSymbols.length === 0) return;
      setCurrentPage(2);
      return;
    }

    // For regular API widgets, test the connection
    if (!widgetName || !apiUrl) return;

    // Reconstruct URL with current params
    const { baseUrl } = parseUrlParams(apiUrl);
    const finalUrl = reconstructUrl(baseUrl, urlParams);
    setApiUrl(finalUrl);

    const success = await performApiTest(finalUrl, headers);
    if (success) {
      // After successful API test, check if we should transform the data
      // and update apiFields with transformed column definitions
      if (shouldTransformApi(finalUrl)) {
        try {
          // Fetch the data again to transform it
          const needsProxy =
            finalUrl.includes("finnhub.io") || finalUrl.includes("alphavantage.co");
          
          let response;
          if (needsProxy) {
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(finalUrl)}`;
            response = await fetch(proxyUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                ...headers,
              },
            });
          } else {
            response = await fetch(finalUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                ...headers,
              },
            });
          }

          if (response.ok) {
            const rawData = await response.json();
            const transformResult = await transformApiData(rawData, finalUrl);
            
            if (transformResult && transformResult.columns) {
              // Convert ColumnDefinition[] to APIField[] for the field selector
              const transformedFields = transformResult.columns.map((col: ColumnDefinition) => ({
                key: col.key,
                value: col.type,
                type: col.type,
              }));
              
              setApiFields(transformedFields);
            }
          }
        } catch (error) {
          console.error("Error transforming data:", error);
          // Continue with raw fields if transformation fails
        }
      }
      
      setCurrentPage(2);
    }
  }, [enableRealtime, websocketUrl, selectedSymbols, widgetName, apiUrl, headers, performApiTest, setApiFields]);

  const handleAddWidget = useCallback(() => {
    if (!widgetName) return;
    
    // For WebSocket widgets, we don't need API URL
    if (enableRealtime) {
      if (!websocketUrl || selectedSymbols.length === 0) return;
    } else {
      // For regular widgets, we need API URL and fields
      if (!apiUrl || selectedFields.length === 0) return;
    }

    const config: WidgetConfig = {
      name: widgetName,
      ...(apiUrl && !enableRealtime && { apiUrl }), // Only include apiUrl if not using WebSocket
      refreshInterval,
      displayMode,
      selectedFields: enableRealtime ? ["symbol", "price", "volume", "time"] : selectedFields,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      enableRealtime,
      realtimeProvider: enableRealtime ? 'finnhub' : undefined,
      realtimeSymbol: enableRealtime ? selectedSymbols[0] : undefined,
      websocketUrl: enableRealtime ? websocketUrl : undefined,
      websocketSymbols: enableRealtime ? selectedSymbols : undefined,
    };

    onAddWidget(config);
    onClose();
  }, [widgetName, enableRealtime, websocketUrl, selectedSymbols, apiUrl, selectedFields, refreshInterval, displayMode, headers, onAddWidget, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 dark:bg-black flex items-center justify-center z-50"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <motion.h2
                className="text-xl font-semibold text-slate-900 dark:text-white"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                {editingWidget ? "Edit Widget" : "Add New Widget"}
                <span className="block text-sm font-normal text-slate-600 dark:text-slate-400 mt-1">
                  {currentPage === 1
                    ? "Step 1: Configure your data source"
                    : "Step 2: Customize display options"}
                </span>
              </motion.h2>
              <motion.button
                onClick={onClose}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-transform"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <motion.div
                  className="bg-emerald-500 h-2 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: currentPage === 1 ? "50%" : "100%" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>Configure</span>
                <span>Customize</span>
              </div>
            </div>

            <motion.div className="space-y-4">
              {/* PAGE 1: Quick Start, Widget Name, API URL, Headers */}
              {currentPage === 1 && (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {/* Quick Start Presets */}
                  <motion.div
                    custom={0}
                    initial="hidden"
                    animate="visible"
                    variants={itemVariants}
                  >
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-3">
                      Quick Start - Works with ANY Financial API
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        type="button"
                        onClick={() => {
                          handleApiUrlChange("https://stock.indianapi.in/trending");
                          setWidgetName("Trending Stocks");
                          setHeaders({ "X-Api-Key": "your-api-key-here" });
                          setEnableRealtime(false);
                        }}
                        className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        📈 Trending Stocks
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => {
                          handleApiUrlChange(
                            "https://stock.indianapi.in/historical_data?stock_name=RELIANCE&period=1m&filter=price"
                          );
                          setWidgetName("RELIANCE Stock Chart");
                          setDisplayMode("chart");
                          setHeaders({ "X-Api-Key": "your-api-key-here" });
                          setEnableRealtime(false);
                        }}
                        className="w-full text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        📊 Indian API Chart
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => {
                          handleApiUrlChange(
                            "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo"
                          );
                          setWidgetName("IBM Stock Chart");
                          setDisplayMode("chart");
                          setHeaders({});
                          setEnableRealtime(false);
                        }}
                        className="w-full text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        📊 Alpha Vantage
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => {
                          handleApiUrlChange(
                            "https://finnhub.io/api/v1/quote?symbol=AAPL&token=demo"
                          );
                          setWidgetName("AAPL Stock Chart");
                          setDisplayMode("chart");
                          setHeaders({});
                          setEnableRealtime(false);
                        }}
                        className="w-full text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        📊 Finnhub Chart
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => {
                          setWidgetName("Finnhub Real-Time Trades");
                          setDisplayMode("chart");
                          setHeaders({});
                          setEnableRealtime(true);
                          setSelectedSymbols(["BINANCE:BTCUSDT"]);
                          setWebsocketUrl("wss://ws.finnhub.io?token=");
                          // Don't set apiUrl for WebSocket widgets
                        }}
                        className="w-full text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ⚡ Finnhub Real-Time WebSocket
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Widget Name */}
                  <motion.div
                    custom={1}
                    initial="hidden"
                    animate="visible"
                    variants={itemVariants}
                  >
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-2">
                      Widget Name
                    </label>
                    <input
                      type="text"
                      value={widgetName}
                      onChange={(e) => setWidgetName(e.target.value)}
                      placeholder="e.g., Bitcoin Price Tracker"
                      className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </motion.div>

                  {/* API URL - Hidden when using WebSocket */}
                  {!enableRealtime && (
                    <motion.div
                      custom={2}
                      initial="hidden"
                      animate="visible"
                      variants={itemVariants}
                    >
                      <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-2">
                        API URL
                      </label>
                      <input
                        type="text"
                        value={apiUrl}
                        onChange={(e) => handleApiUrlChange(e.target.value)}
                        placeholder="e.g., https://api.coinbase.com/v2/exchange-rates?currency=BTC"
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />

                      {apiTestSuccess && (
                        <motion.div
                          className="mt-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          ✓ API connection successful! {apiFields.length}{" "}
                          top-level fields found.
                        </motion.div>
                      )}

                      {apiError && (
                        <motion.div
                          className="mt-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {apiError}
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* WebSocket Real-Time Panel */}
                  {enableRealtime && (
                    <motion.div
                      custom={2.5}
                      initial="hidden"
                      animate="visible"
                      variants={itemVariants}
                      className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-200 dark:border-purple-600/50 rounded-lg p-4 space-y-4"
                    >
                      {/* Realtime Header */}
                      <div className="flex items-start gap-3">
                        <span className="text-xl">⚡</span>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            Real-Time WebSocket
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            Get live trade data from Finnhub with WebSocket connection
                          </p>
                        </div>
                      </div>

                      {/* WebSocket URL Input */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                          WebSocket URL (with token)
                        </label>
                        <input
                          type="text"
                          value={websocketUrl}
                          onChange={(e) => setWebsocketUrl(e.target.value)}
                          placeholder="wss://ws.finnhub.io?token=YOUR_TOKEN"
                          className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Symbol Selection */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-3">
                          Subscribe to Symbols
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {/* Preset Symbols */}
                          <motion.button
                            type="button"
                            onClick={() => {
                              const symbol = "AAPL";
                              setSelectedSymbols((prev) =>
                                prev.includes(symbol)
                                  ? prev.filter((s) => s !== symbol)
                                  : [...prev, symbol]
                              );
                            }}
                            className={`text-xs px-3 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ${
                              selectedSymbols.includes("AAPL")
                                ? "bg-red-600 text-white shadow-lg"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span>🔴</span> AAPL
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => {
                              const symbol = "BINANCE:BTCUSDT";
                              setSelectedSymbols((prev) =>
                                prev.includes(symbol)
                                  ? prev.filter((s) => s !== symbol)
                                  : [...prev, symbol]
                              );
                            }}
                            className={`text-xs px-3 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ${
                              selectedSymbols.includes("BINANCE:BTCUSDT")
                                ? "bg-orange-600 text-white shadow-lg"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span>🟠</span> BTC
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => {
                              const symbol = "MSFT";
                              setSelectedSymbols((prev) =>
                                prev.includes(symbol)
                                  ? prev.filter((s) => s !== symbol)
                                  : [...prev, symbol]
                              );
                            }}
                            className={`text-xs px-3 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ${
                              selectedSymbols.includes("MSFT")
                                ? "bg-purple-600 text-white shadow-lg"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span>🟣</span> MSFT
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => setShowRealtimePanel(!showRealtimePanel)}
                            className={`text-xs px-3 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ${
                              showRealtimePanel
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span>⚙️</span> Custom
                          </motion.button>
                        </div>

                        {/* Custom Symbol Input */}
                        {showRealtimePanel && (
                          <motion.div
                            className="space-y-2 mb-3"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <input
                              type="text"
                              value={customSymbol}
                              onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                              placeholder="e.g., GOOG, TSLA, or BINANCE:ETHUSD"
                              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs"
                            />
                            <div className="flex gap-2">
                              <motion.button
                                type="button"
                                onClick={() => {
                                  if (customSymbol && !selectedSymbols.includes(customSymbol)) {
                                    setSelectedSymbols([...selectedSymbols, customSymbol]);
                                    setCustomSymbol("");
                                  }
                                }}
                                disabled={!customSymbol || selectedSymbols.includes(customSymbol)}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors font-medium text-xs"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                + Add Symbol
                              </motion.button>
                            </div>
                          </motion.div>
                        )}

                        {/* Selected Symbols Display */}
                        {selectedSymbols.length > 0 && (
                          <motion.div className="flex flex-wrap gap-2 mb-3">
                            {selectedSymbols.map((symbol, idx) => (
                              <motion.div
                                key={symbol}
                                className="bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <span>{symbol}</span>
                                <motion.button
                                  type="button"
                                  onClick={() =>
                                    setSelectedSymbols(
                                      selectedSymbols.filter((s) => s !== symbol)
                                    )
                                  }
                                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  ✕
                                </motion.button>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>

                      {/* Test WebSocket Button */}
                      <motion.button
                        type="button"
                        onClick={testWebsocketConnection}
                        disabled={
                          isConnectingWebsocket || !websocketUrl || selectedSymbols.length === 0
                        }
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isConnectingWebsocket ? "🔄 Testing Connection..." : "✓ Test WebSocket Connection"}
                      </motion.button>

                      {/* Connection Status Messages */}
                      {isWebsocketConnected && (
                        <motion.div
                          className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-3"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          ✅ WebSocket connected! Received {liveTradeData.length} trades
                        </motion.div>
                      )}

                      {websocketError && (
                        <motion.div
                          className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {websocketError}
                        </motion.div>
                      )}

                      {/* Live Trade Data Preview */}
                      {liveTradeData.length > 0 && (
                        <motion.div
                          className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            📊 Live Trade Data Preview:
                          </h4>
                          <div className="space-y-2">
                            {liveTradeData.slice(0, 5).map((trade, idx) => (
                              <motion.div
                                key={idx}
                                className="text-xs bg-white dark:bg-slate-600 p-2.5 rounded border border-slate-200 dark:border-slate-500"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {trade.s}
                                  </div>
                                  <div className="text-slate-600 dark:text-slate-300 font-medium">
                                    ${trade.p?.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Vol: {trade.v} • {new Date(trade.t).toLocaleTimeString()}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* URL Parameters Input */}
                  <UrlParamsInput
                    params={urlParams}
                    onParamsChange={handleUrlParamsChange}
                  />                  {/* Field Selection Preview on PAGE 1 - Show available fields after API test */}
                  {apiTestSuccess && apiFields.length > 0 && (
                    <motion.div
                      custom={3}
                      initial="hidden"
                      animate="visible"
                      variants={itemVariants}
                    >
                      <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-2">
                        Available Fields Preview
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                        {/* Show currently selected fields when editing */}
                        {editingWidget && selectedFields.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-xs font-medium text-slate-700 dark:text-slate-400 mb-2">
                              Currently Selected Fields ({selectedFields.length})
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {selectedFields.map((field) => (
                                <span
                                  key={field}
                                  className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded"
                                >
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Show available fields */}
                        <h4 className="text-xs font-medium text-slate-700 dark:text-slate-400 mb-2">
                          Available Fields ({apiFields.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {apiFields.slice(0, 10).map((field) => (
                            <div
                              key={field.key}
                              className="text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600"
                            >
                              <div className="font-medium text-slate-900 dark:text-white truncate">
                                {field.key}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 text-[10px] truncate">
                                {field.type}
                              </div>
                            </div>
                          ))}
                        </div>
                        {apiFields.length > 10 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                            +{apiFields.length - 10} more fields available on next page
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                  {/* Headers Component */}
                  <HeaderInput
                    key={editingWidget?.id || "new-widget"}
                    onHeaderChange={setHeaders}
                    initialHeaders={headers}
                  />
                </motion.div>
              )}

              {/* PAGE 2: Refresh Interval, Display Mode, Field Selection */}
              {currentPage === 2 && (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Display Settings Component */}
                  <DisplaySettings
                    refreshInterval={refreshInterval}
                    onRefreshIntervalChange={setRefreshInterval}
                    displayMode={displayMode}
                    onDisplayModeChange={setDisplayMode}
                  />

                  {/* Field Selector Component */}
                  {(apiTestSuccess || editingWidget) && (
                    <FieldSelector
                      apiFields={apiFields}
                      selectedFields={selectedFields}
                      onFieldToggle={handleFieldToggle}
                      editingMode={!!editingWidget}
                    />
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Navigation Buttons */}
            <motion.div
              className="flex justify-between items-center mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div>
                {currentPage === 2 && (
                  <motion.button
                    onClick={() => setCurrentPage(1)}
                    className="flex items-center space-x-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </motion.button>
                )}
              </div>

              <div className="flex space-x-3">
                <motion.button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>

                {currentPage === 1 ? (
                  <motion.button
                    onClick={handleNextStep}
                    disabled={
                      enableRealtime
                        ? !widgetName || !websocketUrl || selectedSymbols.length === 0
                        : !widgetName || !apiUrl || isTestingApi
                    }
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      apiError && !enableRealtime
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    } disabled:bg-slate-400 dark:disabled:bg-slate-600`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>
                      {enableRealtime
                        ? "Next Step"
                        : isTestingApi
                        ? "Testing API..."
                        : apiError
                        ? "Fix Error & Try Again"
                        : "Test & Continue"}
                    </span>
                    {(!isTestingApi || enableRealtime) && !apiError && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleAddWidget}
                    disabled={
                      enableRealtime
                        ? !widgetName || !selectedSymbols.length
                        : !widgetName || !apiUrl || selectedFields.length === 0
                    }
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {editingWidget ? "Update Widget" : "Add Widget"}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
