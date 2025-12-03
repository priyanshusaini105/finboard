// Universal API Response Adapter System
export interface ChartDataPoint {
  date: string;
  fullDate: string;
  price: number;
  volume?: number;
  dma50?: number | null;
  dma200?: number | null;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface TableDataRow {
  [key: string]: unknown;
}

export interface CardData {
  [key: string]: unknown;
}

export function getValueFromPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  // Handle array notation like "trending_stocks.top_gainers[].company_name"
  if (path.includes("[]")) {
    const [arrayPath, propertyPath] = path.split("[].");
    const arrayData = arrayPath
      .split(".")
      .reduce((current: unknown, key: string) => {
        if (current && typeof current === "object" && key in current) {
          return (current as Record<string, unknown>)[key];
        }
        return undefined;
      }, obj as unknown);

    if (Array.isArray(arrayData) && propertyPath) {
      // Return array of the specific property from each object
      return arrayData
        .map((item) => {
          if (item && typeof item === "object" && propertyPath in item) {
            return (item as Record<string, unknown>)[propertyPath];
          }
          return undefined;
        })
        .filter((val) => val !== undefined);
    }
    return arrayData;
  }

  // Handle normal dot notation
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

// Simple exported functions for easy use
export function transformData(
  data: unknown,
  widgetType: "chart" | "table" | "card",
  pathHint?: string
): ChartDataPoint[] | TableDataRow[] | CardData {
  if (!data)
    return widgetType === "table" ? [] : widgetType === "chart" ? [] : {};

  switch (widgetType) {
    case "chart":
      return autoDetectChartData(data);
    case "table":
      return autoDetectTableData(data, pathHint);
    case "card":
      return autoDetectCardData(data);
  }
}

// Map old field paths to new simplified paths
export function mapFieldPath(originalPath: string, originalData: unknown): string {
  // Alpha Vantage Global Quote field mapping
  if (
    typeof originalData === "object" &&
    originalData !== null &&
    "Global Quote" in originalData
  ) {
    const fieldMap: Record<string, string> = {
      "Global Quote.01. symbol": "symbol",
      "Global Quote.02. open": "open",
      "Global Quote.03. high": "high",
      "Global Quote.04. low": "low",
      "Global Quote.05. price": "price",
      "Global Quote.06. volume": "volume",
      "Global Quote.07. latest trading day": "latest trading day",
      "Global Quote.08. previous close": "previous close",
      "Global Quote.09. change": "change",
      "Global Quote.10. change percent": "change percent",
    };

    return fieldMap[originalPath] || originalPath;
  }

  // Generic mapping for common financial API fields (Alpha Vantage, etc.)
  const commonMappings: Record<string, string> = {
    "1. open": "open",
    "2. high": "high",
    "3. low": "low",
    "4. close": "close",
    "5. volume": "volume",
    "open": "open",
    "high": "high",
    "low": "low",
    "close": "close",
    "volume": "volume",
    "date": "date",
    "timestamp": "date",
    "time": "date",
    "symbol": "symbol",
    "2. Symbol": "symbol",
    "time zone": "timezone",
    "timezone": "timezone",
    "5. Time Zone": "timezone",
    "last refreshed": "last refreshed",
    "3. Last Refreshed": "last refreshed",
    "information": "last refreshed",
    "meta": "meta",
    "META": "meta",
    "values": "price",
    "VALUES": "price",
    "metric": "metric",
    "METRIC": "metric",
    "label": "label",
    "LABEL": "label",
    "price": "price",
    "PRICE": "price",
    "dma50": "dma50",
    "DMA50": "dma50",
    "dma200": "dma200",
    "DMA200": "dma200",
    "VOLUME": "volume"
  };

  // Try lowercase match first
  const lowerPath = originalPath.toLowerCase();
  
  // Exact match (case-sensitive)
  if (commonMappings[originalPath]) {
    return commonMappings[originalPath];
  }

  // Case-insensitive exact match
  for (const [key, mappedKey] of Object.entries(commonMappings)) {
    if (key.toLowerCase() === lowerPath) {
      return mappedKey;
    }
  }

  // Suffix match (e.g. "Time Series (Daily).2023.1. open" -> "open")
  for (const [key, mappedKey] of Object.entries(commonMappings)) {
    if (originalPath.endsWith(`.${key}`) || originalPath.endsWith(` ${key}`)) {
      return mappedKey;
    }
  }

  return originalPath;
}

export function getSymbolFromUrl(apiUrl: string): string {
  // Common parameter patterns
  const patterns = [
    /stock_name=([^&]+)/, // Indian API
    /symbol=([^&]+)/, // Alpha Vantage, Finnhub
  ];

  for (const pattern of patterns) {
    const match = apiUrl.match(pattern);
    if (match) return match[1];
  }

  return "STOCK";
}

// Smart chart data detection - works with any time-series format
function autoDetectChartData(data: unknown): ChartDataPoint[] {
  try {
    if (
      typeof data !== "object" ||
      data === null
    ) {
      return [];
    }

    const dataObj = data as Record<string, unknown>;

    // Indian API format (datasets with Price/Volume metrics)
    if (dataObj.datasets && Array.isArray(dataObj.datasets)) {
      return parseIndianAPIChart(dataObj);
    }

    // Alpha Vantage format (Time Series)
    if (
      dataObj["Time Series (Daily)"] ||
      dataObj["Weekly Time Series"] ||
      dataObj["Monthly Time Series"]
    ) {
      return parseAlphaVantageChart(dataObj);
    }

    // Finnhub format (arrays: c, h, l, o, t, v)
    if (dataObj.c && dataObj.t && Array.isArray(dataObj.c) && Array.isArray(dataObj.t)) {
      return parseFinnhubChart(dataObj);
    }

    // Generic array format [{date, price, volume}, ...]
    if (Array.isArray(data)) {
      return parseGenericArrayChart(data);
    }

    // Generic object with arrays {dates: [], prices: [], volumes: []}
    if (
      dataObj.dates &&
      dataObj.prices &&
      Array.isArray(dataObj.dates) &&
      Array.isArray(dataObj.prices)
    ) {
      return parseGenericObjectChart(dataObj);
    }

    return [];
  } catch (error) {
    console.error("Chart parsing error:", error);
    return [];
  }
}

// Smart table data detection - works with any array/object format
function autoDetectTableData(data: unknown, pathHint?: string): TableDataRow[] {
  try {
    // Direct array
    if (Array.isArray(data)) {
      return data as TableDataRow[];
    }

    if (typeof data !== "object" || data === null) {
      return [];
    }

    const dataObj = data as Record<string, unknown>;

    // Try to use pathHint if provided
    if (pathHint) {
      const cleanPath = pathHint.split("[]")[0];
      if (cleanPath) {
        const array = getValueFromPath(dataObj, cleanPath);
        if (Array.isArray(array)) return array as TableDataRow[];
      }
    }

    // Indian API datasets format (historical data with Price, DMA50, DMA200, Volume)
    if (dataObj.datasets && Array.isArray(dataObj.datasets)) {
      const datasets = dataObj.datasets as Array<Record<string, unknown>>;
      
      // Find datasets by metric
      const priceDataset = datasets.find((d) => d.metric === "Price") as Record<string, unknown> | undefined;
      const dma50Dataset = datasets.find((d) => d.metric === "DMA50") as Record<string, unknown> | undefined;
      const dma200Dataset = datasets.find((d) => d.metric === "DMA200") as Record<string, unknown> | undefined;
      const volumeDataset = datasets.find((d) => d.metric === "Volume") as Record<string, unknown> | undefined;

      if (!priceDataset || !Array.isArray(priceDataset.values)) {
        // If no price data, return empty array
        return [];
      }

      // Transform from datasets format to row-based format
      const priceValues = priceDataset.values as Array<[string, string]>;
      const dma50Values = (dma50Dataset?.values as Array<[string, string]>) || [];
      const dma200Values = (dma200Dataset?.values as Array<[string, string]>) || [];
      const volumeValues = (volumeDataset?.values as Array<[string, string]>) || [];

      return priceValues.map((priceEntry, index) => {
        const [date, price] = priceEntry;
        const dma50Entry = dma50Values[index];
        const dma200Entry = dma200Values[index];
        const volumeEntry = volumeValues[index];

        return {
          date,
          price: parseFloat(price),
          dma50: dma50Entry ? parseFloat(dma50Entry[1]) : undefined,
          dma200: dma200Entry ? parseFloat(dma200Entry[1]) : undefined,
          volume: volumeEntry ? parseFloat(volumeEntry[1]) : undefined,
          metric: priceDataset.label || "Price",
          label: priceDataset.label || "Price on NSE",
          meta: JSON.stringify(priceDataset.meta || {}),
        };
      });
    }

    // Indian API trending_stocks format
    if (dataObj.trending_stocks) {
      // Combine top_gainers and top_losers into a single array
      const trendingStocks = dataObj.trending_stocks as Record<string, unknown>;
      const gainers = (trendingStocks.top_gainers as TableDataRow[]) || [];
      const losers = (trendingStocks.top_losers as TableDataRow[]) || [];
      return [...gainers, ...losers];
    }

    // Generic data wrapper
    if (dataObj.data && Array.isArray(dataObj.data)) {
      return dataObj.data as TableDataRow[];
    }

    // Nested data in common API patterns
    const arrayProperties = [
      "results",
      "items",
      "stocks",
      "quotes",
      "list",
      "entries",
    ];
    for (const prop of arrayProperties) {
      if (dataObj[prop] && Array.isArray(dataObj[prop])) {
        return dataObj[prop] as TableDataRow[];
      }
    }

    // Auto-detect any array property if not found in common list
    const keys = Object.keys(dataObj);
    const arrayKeys = keys.filter(key => Array.isArray(dataObj[key]));
    if (arrayKeys.length === 1) {
        return dataObj[arrayKeys[0]] as TableDataRow[];
    }

    // Time series to table conversion
    if (dataObj["Time Series (Daily)"] && typeof dataObj["Time Series (Daily)"] === "object") {
      const timeSeries = dataObj["Time Series (Daily)"] as Record<string, unknown>;
      const metaData = dataObj["Meta Data"] as Record<string, unknown> | undefined;
      const symbol = metaData ? String(metaData["2. Symbol"]) : "N/A";
      const timezone = metaData ? String(metaData["5. Time Zone"]) : "N/A";
      const lastRefreshed = metaData ? String(metaData["3. Last Refreshed"]) : "N/A";
      
      return Object.entries(timeSeries).map(
        ([date, values]) => {
          const valuesObj = values as Record<string, unknown>;
          return {
            date,
            open: parseFloat(String(valuesObj["1. open"])),
            high: parseFloat(String(valuesObj["2. high"])),
            low: parseFloat(String(valuesObj["3. low"])),
            close: parseFloat(String(valuesObj["4. close"])),
            volume: parseFloat(String(valuesObj["5. volume"])),
            symbol,
            timezone,
            "last refreshed": lastRefreshed,
          };
        }
      );
    }

    // Finnhub to table conversion
    if (dataObj.c && dataObj.t && Array.isArray(dataObj.c) && Array.isArray(dataObj.t)) {
      const c = dataObj.c as number[];
      const h = (dataObj.h as number[]) || [];
      const l = (dataObj.l as number[]) || [];
      const o = (dataObj.o as number[]) || [];
      const t = dataObj.t as number[];
      const v = (dataObj.v as number[]) || [];
      return c.map((close, index) => {
        const date = new Date(t[index] * 1000);
        return {
          date: date.toISOString().split("T")[0],
          open: o[index],
          high: h[index],
          low: l[index],
          close: close,
          volume: v[index],
        };
      });
    }

    // Single object to array
    if (typeof data === "object" && !Array.isArray(data)) {
      return [data as TableDataRow];
    }

    return [];
  } catch (error) {
    console.error("Table parsing error:", error);
    return [];
  }
}

// Smart card data detection - extracts key metrics
function autoDetectCardData(data: unknown): CardData {
  try {
    // Array - take first item
    if (Array.isArray(data) && data.length > 0) {
      return (data[0] as CardData) || {};
    }

    if (typeof data !== "object" || data === null) {
      return {};
    }

    const dataObj = data as Record<string, unknown>;

    // Indian API trending_stocks format - return summary stats
    if (dataObj.trending_stocks) {
      const trendingStocks = dataObj.trending_stocks as Record<string, unknown>;
      const gainers = (trendingStocks.top_gainers as Array<Record<string, unknown>>) || [];
      const losers = (trendingStocks.top_losers as Array<Record<string, unknown>>) || [];
      return {
        total_gainers: gainers.length,
        total_losers: losers.length,
        top_gainer: gainers[0]?.company_name || "N/A",
        top_gainer_change: gainers[0]?.percent_change || "0",
        top_loser: losers[0]?.company_name || "N/A",
        top_loser_change: losers[0]?.percent_change || "0",
      };
    }

    // Alpha Vantage Global Quote format
    if (dataObj["Global Quote"] && typeof dataObj["Global Quote"] === "object") {
      const quote = dataObj["Global Quote"] as Record<string, unknown>;
      return {
        symbol: quote["01. symbol"],
        open: parseFloat(String(quote["02. open"])),
        high: parseFloat(String(quote["03. high"])),
        low: parseFloat(String(quote["04. low"])),
        price: parseFloat(String(quote["05. price"])),
        volume: parseInt(String(quote["06. volume"])),
        "latest trading day": quote["07. latest trading day"],
        "previous close": parseFloat(String(quote["08. previous close"])),
        change: parseFloat(String(quote["09. change"])),
        "change percent": quote["10. change percent"],
      };
    }

    // Nested data.data pattern
    if (dataObj.data && Array.isArray(dataObj.data) && dataObj.data.length > 0) {
      return (dataObj.data[0] as CardData) || {};
    }

    // Time series - get latest data point
    const timeSeries =
      (dataObj["Time Series (Daily)"] as Record<string, unknown>) ||
      (dataObj["Weekly Time Series"] as Record<string, unknown>) ||
      (dataObj["Monthly Time Series"] as Record<string, unknown>);
    if (timeSeries && typeof timeSeries === "object") {
      const latestDate = Object.keys(timeSeries).sort().reverse()[0];
      const latestData = timeSeries[latestDate] as Record<string, unknown>;
      return {
        date: latestDate,
        price: parseFloat(String(latestData["4. close"])),
        open: parseFloat(String(latestData["1. open"])),
        high: parseFloat(String(latestData["2. high"])),
        low: parseFloat(String(latestData["3. low"])),
        volume: parseFloat(String(latestData["5. volume"])),
      };
    }

    // Finnhub - get latest data point
    if (dataObj.c && dataObj.t && Array.isArray(dataObj.c) && Array.isArray(dataObj.t)) {
      const c = dataObj.c as number[];
      const h = (dataObj.h as number[]) || [];
      const l = (dataObj.l as number[]) || [];
      const o = (dataObj.o as number[]) || [];
      const t = dataObj.t as number[];
      const v = (dataObj.v as number[]) || [];
      const lastIndex = c.length - 1;
      const date = new Date(t[lastIndex] * 1000);

      return {
        date: date.toISOString().split("T")[0],
        price: c[lastIndex],
        open: o[lastIndex],
        high: h[lastIndex],
        low: l[lastIndex],
        close: c[lastIndex],
        volume: v[lastIndex],
      };
    }

    // Direct object
    return dataObj as CardData;
  } catch (error) {
    console.error("Card parsing error:", error);
    return {};
  }
}

// Specific format parsers
function parseIndianAPIChart(data: Record<string, unknown>): ChartDataPoint[] {
  const datasets = data.datasets as Array<Record<string, unknown>>;
  const priceDataset = datasets.find((d) => d.metric === "Price") as Record<string, unknown> | undefined;
  const volumeDataset = datasets.find((d) => d.metric === "Volume") as Record<string, unknown> | undefined;
  const dma50Dataset = datasets.find((d) => d.metric === "DMA50") as Record<string, unknown> | undefined;
  const dma200Dataset = datasets.find((d) => d.metric === "DMA200") as Record<string, unknown> | undefined;

  if (!priceDataset || !Array.isArray(priceDataset.values)) return [];

  return (priceDataset.values as Array<[string, string]>).map((priceEntry, index) => {
    const [date, price] = priceEntry;
    const volumeEntry = volumeDataset && Array.isArray(volumeDataset.values) 
      ? (volumeDataset.values as Array<[string, string]>)[index]
      : undefined;
    const dma50Entry = dma50Dataset && Array.isArray(dma50Dataset.values) 
      ? (dma50Dataset.values as Array<[string, string]>)[index]
      : undefined;
    const dma200Entry = dma200Dataset && Array.isArray(dma200Dataset.values) 
      ? (dma200Dataset.values as Array<[string, string]>)[index]
      : undefined;

    return {
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: date,
      price: parseFloat(price),
      volume: volumeEntry ? parseFloat(volumeEntry[1]) : undefined,
      dma50: dma50Entry ? parseFloat(dma50Entry[1]) : null,
      dma200: dma200Entry ? parseFloat(dma200Entry[1]) : null,
    };
  });
}

function parseAlphaVantageChart(data: Record<string, unknown>): ChartDataPoint[] {
  const timeSeries = (
    data["Time Series (Daily)"] ||
    data["Weekly Time Series"] ||
    data["Monthly Time Series"]
  ) as Record<string, Record<string, string>>;

  return Object.entries(timeSeries)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, values]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: date,
      price: parseFloat(values["4. close"]),
      volume: parseFloat(values["5. volume"]),
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
    }));
}

function parseFinnhubChart(data: Record<string, unknown>): ChartDataPoint[] {
  const c = data.c as number[];
  const h = (data.h as number[]) || [];
  const l = (data.l as number[]) || [];
  const o = (data.o as number[]) || [];
  const t = data.t as number[];
  const v = (data.v as number[]) || [];

  return c.map((close, index) => {
    const date = new Date(t[index] * 1000);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: date.toISOString().split("T")[0],
      price: close,
      volume: v[index],
      open: o[index],
      high: h[index],
      low: l[index],
      close: close,
    };
  });
}

function parseGenericArrayChart(data: unknown[]): ChartDataPoint[] {
  return data.map((item, index) => {
    const itemObj = item as Record<string, unknown>;
    const date = itemObj.date || itemObj.timestamp || itemObj.time || `Day ${index + 1}`;
    const price = itemObj.price || itemObj.close || itemObj.value || 0;

    return {
      date:
        typeof date === "string"
          ? new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : String(date),
      fullDate: typeof date === "string" ? date : `${date}`,
      price: parseFloat(String(price)) || 0,
      volume: itemObj.volume ? parseFloat(String(itemObj.volume)) : undefined,
      open: itemObj.open ? parseFloat(String(itemObj.open)) : undefined,
      high: itemObj.high ? parseFloat(String(itemObj.high)) : undefined,
      low: itemObj.low ? parseFloat(String(itemObj.low)) : undefined,
      close: itemObj.close ? parseFloat(String(itemObj.close)) : undefined,
    };
  });
}

function parseGenericObjectChart(data: Record<string, unknown>): ChartDataPoint[] {
  const prices = data.prices as number[];
  const dates = (data.dates as string[]) || [];
  const volumes = (data.volumes as number[]) || [];

  return prices.map((price, index) => ({
    date: dates[index] || `Day ${index + 1}`,
    fullDate: dates[index] || `${index}`,
    price: parseFloat(String(price)) || 0,
    volume: volumes[index] ? parseFloat(String(volumes[index])) : undefined,
  }));
}
