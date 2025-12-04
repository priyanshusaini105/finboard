"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
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
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, editingWidget, setApiFields, setApiTestSuccess, setApiError]);


  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

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

  const handleNextStep = async () => {
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
  };

  const handleAddWidget = () => {
    if (!widgetName || !apiUrl || selectedFields.length === 0) return;

    const config: WidgetConfig = {
      name: widgetName,
      apiUrl,
      refreshInterval,
      displayMode,
      selectedFields,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };

    onAddWidget(config);
    onClose();
  };

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
                        }}
                        className="w-full text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        📊 Finnhub Chart
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

                  {/* API URL */}
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
                    disabled={!widgetName || !apiUrl || isTestingApi}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      apiError
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    } disabled:bg-slate-400 dark:disabled:bg-slate-600`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>
                      {isTestingApi
                        ? "Testing API..."
                        : apiError
                        ? "Fix Error & Try Again"
                        : "Test & Continue"}
                    </span>
                    {!isTestingApi && !apiError && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleAddWidget}
                    disabled={
                      !widgetName || !apiUrl || selectedFields.length === 0
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
