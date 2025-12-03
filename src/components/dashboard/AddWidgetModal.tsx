"use client";

import { useState, useEffect, useRef } from "react";
import { X, TestTube, CreditCard, Table, TrendingUp } from "lucide-react";
import { WidgetConfig, APIField, Widget } from "../../types/widget";

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (config: WidgetConfig) => void;
  editingWidget?: Widget | null;
}

export default function AddWidgetModal({
  isOpen,
  onClose,
  onAddWidget,
  editingWidget,
}: AddWidgetModalProps) {
  const [widgetName, setWidgetName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [displayMode, setDisplayMode] = useState<"card" | "table" | "chart">(
    "card"
  );
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiFields, setApiFields] = useState<APIField[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [apiTestSuccess, setApiTestSuccess] = useState(false);
  const [apiError, setApiError] = useState("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const hasAutoTestedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setWidgetName("");
      setApiUrl("");
      setRefreshInterval(30);
      setDisplayMode("card");
      setApiFields([]);
      setSelectedFields([]);
      setApiTestSuccess(false);
      setApiError("");
      setHeaders({});
      setNewHeaderKey("");
      setNewHeaderValue("");
      hasAutoTestedRef.current = false;
    } else if (editingWidget) {
      // Populate form with existing widget data when editing
      setWidgetName(editingWidget.title);
      setApiUrl(editingWidget.apiUrl || "");
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
      setApiTestSuccess(false);
      setApiError("");
      setApiFields([]); // Don't auto-populate, let user see their current selection first
      hasAutoTestedRef.current = false;
    }
  }, [isOpen, editingWidget]);

  const testApiConnection = async () => {
    if (!apiUrl) return;

    setIsTestingApi(true);
    setApiError("");

    // Store current selected fields to preserve them in edit mode
    const currentSelectedFields = [...selectedFields];

    try {
      // Check if we need to use proxy for external APIs
      const needsProxy =
        apiUrl.includes("finnhub.io") || apiUrl.includes("alphavantage.co");

      let response;

      if (needsProxy) {
        // Use proxy for external APIs that have CORS issues
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(apiUrl)}`;
        response = await fetch(proxyUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
      } else {
        // Direct request for APIs without CORS issues
        response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract fields from API response
      const extractFields = (obj: any, prefix = ""): APIField[] => {
        const fields: APIField[] = [];
        for (const [key, value] of Object.entries(obj)) {
          const fieldKey = prefix ? `${prefix}.${key}` : key;

          if (Array.isArray(value)) {
            // Handle arrays - add the array itself as a field
            fields.push({
              key: fieldKey,
              value: `Array(${value.length}) - ${
                value.length > 0 ? "Click to see items" : "Empty"
              }`,
              type: "array",
            });

            // If array has objects, extract fields from the first object to show available properties
            if (
              value.length > 0 &&
              typeof value[0] === "object" &&
              value[0] !== null
            ) {
              const sampleObject = value[0];
              for (const [objKey, objValue] of Object.entries(sampleObject)) {
                const objectFieldKey = `${fieldKey}[].${objKey}`;
                fields.push({
                  key: objectFieldKey,
                  value: objValue,
                  type: typeof objValue,
                });
              }
            }
          } else if (typeof value === "object" && value !== null) {
            // Handle nested objects
            fields.push(...extractFields(value, fieldKey));
          } else {
            // Handle primitive values
            fields.push({
              key: fieldKey,
              value: value,
              type: typeof value,
            });
          }
        }
        return fields;
      };

      const fields = extractFields(data);
      setApiFields(fields);
      setApiTestSuccess(true);

      // In edit mode, preserve the existing selected fields
      if (editingWidget && currentSelectedFields.length > 0) {
        setSelectedFields(currentSelectedFields);
      }
    } catch (error) {
      setApiError("Failed to connect to API. Please check the URL.");
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      setHeaders((prev) => ({
        ...prev,
        [newHeaderKey]: newHeaderValue,
      }));
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    setHeaders((prev) => {
      const newHeaders = { ...prev };
      delete newHeaders[key];
      return newHeaders;
    });
  };

  const addQuickHeader = (type: "api-key" | "bearer" | "basic") => {
    switch (type) {
      case "api-key":
        setNewHeaderKey("X-Api-Key");
        break;
      case "bearer":
        setNewHeaderKey("Authorization");
        setNewHeaderValue("Bearer ");
        break;
      case "basic":
        setNewHeaderKey("Authorization");
        setNewHeaderValue("Basic ");
        break;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {editingWidget ? "Edit Widget" : "Add New Widget"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Widget Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Widget Name
            </label>
            <input
              type="text"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              placeholder="e.g., Bitcoin Price Tracker"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="e.g., https://api.coinbase.com/v2/exchange-rates?currency=BTC"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                onClick={testApiConnection}
                disabled={!apiUrl || isTestingApi}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <TestTube className="w-4 h-4" />
                <span>{isTestingApi ? "Testing..." : "Test"}</span>
              </button>
            </div>

            {apiTestSuccess && (
              <div className="mt-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
                ✓ API connection successful! {apiFields.length} top-level fields
                found.
              </div>
            )}

            {apiError && (
              <div className="mt-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                {apiError}
              </div>
            )}

            {/* Quick Start Presets */}
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-2">
                Quick Start - Works with ANY Financial API:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setApiUrl("https://stock.indianapi.in/trending");
                    setWidgetName("Trending Stocks");
                    setHeaders({ "X-Api-Key": "your-api-key-here" });
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                >
                  📈 Trending Stocks (Table)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiUrl(
                      "https://stock.indianapi.in/historical_data?stock_name=RELIANCE&period=1m&filter=price"
                    );
                    setWidgetName("RELIANCE Stock Chart");
                    setDisplayMode("chart");
                    setHeaders({ "X-Api-Key": "your-api-key-here" });
                  }}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded transition-colors"
                >
                  📊 Indian API Chart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiUrl(
                      "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo"
                    );
                    setWidgetName("IBM Stock Chart");
                    setDisplayMode("chart");
                    setHeaders({});
                  }}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
                >
                  📊 Alpha Vantage Chart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiUrl(
                      "https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&from=1631203200&to=1631289600&token=demo"
                    );
                    setWidgetName("AAPL Stock Chart");
                    setDisplayMode("chart");
                    setHeaders({});
                  }}
                  className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded transition-colors"
                >
                  📊 Finnhub Chart
                </button>
              </div>
            </div>
          </div>

          {/* Headers */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Headers (Optional)
            </label>

            {/* Quick header buttons */}
            <div className="flex space-x-2 mb-3">
              <button
                type="button"
                onClick={() => addQuickHeader("api-key")}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              >
                + X-Api-Key
              </button>
              <button
                type="button"
                onClick={() => addQuickHeader("bearer")}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              >
                + Bearer Token
              </button>
              <button
                type="button"
                onClick={() => addQuickHeader("basic")}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              >
                + Basic Auth
              </button>
            </div>

            {/* Add new header */}
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newHeaderKey}
                onChange={(e) => setNewHeaderKey(e.target.value)}
                placeholder="Header name (e.g., X-Api-Key)"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
              <input
                type="text"
                value={newHeaderValue}
                onChange={(e) => setNewHeaderValue(e.target.value)}
                placeholder="Header value"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={addHeader}
                disabled={!newHeaderKey || !newHeaderValue}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Add
              </button>
            </div>

            {/* Display existing headers */}
            {Object.keys(headers).length > 0 && (
              <div className="space-y-2">
                {Object.entries(headers).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between bg-slate-700 p-2 rounded border"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium text-emerald-400">
                        {key}:
                      </span>
                      <span className="text-sm text-slate-300 ml-2">
                        {key.toLowerCase().includes("authorization") ||
                        key.toLowerCase().includes("key")
                          ? value.substring(0, 10) + "..."
                          : value}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Refresh Interval (seconds)
            </label>
            <input
              type="number"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              min="10"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Display Mode */}
          {(apiTestSuccess || editingWidget) && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Mode
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setDisplayMode("card")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      displayMode === "card"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>
                  <button
                    onClick={() => setDisplayMode("table")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      displayMode === "table"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    <Table className="w-4 h-4" />
                    <span>Table</span>
                  </button>
                  <button
                    onClick={() => setDisplayMode("chart")}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      displayMode === "chart"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Chart</span>
                  </button>
                </div>
              </div>

              {/* Field Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Fields to Display
                </label>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search for fields..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {/* Show currently selected fields when editing */}
                  {editingWidget &&
                    selectedFields.length > 0 &&
                    apiFields.length === 0 && (
                      <>
                        <h4 className="text-sm font-medium text-slate-300">
                          Currently Selected Fields
                        </h4>
                        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-4">
                          <p className="text-blue-300 text-xs mb-2">
                            These are your currently selected fields. Click
                            "Test API" to see all available fields and make
                            changes.
                          </p>
                          <div className="space-y-2">
                            {selectedFields.map((fieldKey) => (
                              <div
                                key={fieldKey}
                                className="flex items-center justify-between p-2 bg-slate-700 rounded border border-slate-600"
                              >
                                <div className="flex-1">
                                  <div className="text-sm text-white flex items-center gap-2">
                                    {fieldKey}
                                    {fieldKey.includes("[]") && (
                                      <span className="text-xs bg-green-600 px-1 py-0.5 rounded">
                                        Item Property
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    Currently selected
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleFieldToggle(fieldKey)}
                                  className="px-2 py-1 rounded text-xs bg-emerald-500 text-white"
                                  title="Remove field"
                                >
                                  −
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                  {/* Show available fields when API has been tested */}
                  {apiFields.length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-slate-300">
                        Available Fields
                      </h4>
                      {apiFields.slice(0, 15).map((field) => (
                        <div
                          key={field.key}
                          className="flex items-center justify-between p-2 bg-slate-700 rounded border border-slate-600"
                        >
                          <div className="flex-1">
                            <div className="text-sm text-white flex items-center gap-2">
                              {field.key}
                              {field.type === "array" && (
                                <span className="text-xs bg-blue-600 px-1 py-0.5 rounded">
                                  Array
                                </span>
                              )}
                              {field.key.includes("[]") && (
                                <span className="text-xs bg-green-600 px-1 py-0.5 rounded">
                                  Item Property
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              {field.type}:{" "}
                              {field.type === "array"
                                ? field.value
                                : String(field.value).substring(0, 50) +
                                  (String(field.value).length > 50
                                    ? "..."
                                    : "")}
                            </div>
                          </div>
                          <button
                            onClick={() => handleFieldToggle(field.key)}
                            className={`px-2 py-1 rounded text-xs ${
                              selectedFields.includes(field.key)
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                            }`}
                          >
                            {selectedFields.includes(field.key) ? "−" : "+"}
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Show message when no fields and not editing */}
                  {!editingWidget && apiFields.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <p>
                        Test your API connection first to see available fields
                      </p>
                    </div>
                  )}
                </div>

                {selectedFields.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">
                      Selected Fields
                    </h4>
                    <div className="space-y-1">
                      {selectedFields.map((fieldKey) => (
                        <div
                          key={fieldKey}
                          className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded"
                        >
                          <span className="text-sm text-emerald-400">
                            {fieldKey}
                          </span>
                          <button
                            onClick={() => handleFieldToggle(fieldKey)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddWidget}
            disabled={!widgetName || !apiUrl || selectedFields.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {editingWidget ? "Update Widget" : "Add Widget"}
          </button>
        </div>
      </div>
    </div>
  );
}
