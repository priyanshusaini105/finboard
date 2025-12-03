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
  [key: string]: any;
}

export interface CardData {
  [key: string]: any;
}

// Simple exported functions for easy use
export function transformData(
  data: any,
  widgetType: "chart" | "table" | "card"
): any {
  if (!data)
    return widgetType === "table" ? [] : widgetType === "chart" ? [] : {};

  switch (widgetType) {
    case "chart":
      return autoDetectChartData(data);
    case "table":
      return autoDetectTableData(data);
    case "card":
      return autoDetectCardData(data);
    default:
      return data;
  }
}

// Map old field paths to new simplified paths
export function mapFieldPath(originalPath: string, originalData: any): string {
  // Alpha Vantage Global Quote field mapping
  if (originalData["Global Quote"]) {
    const fieldMap: { [key: string]: string } = {
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
function autoDetectChartData(data: any): ChartDataPoint[] {
  try {
    // Indian API format (datasets with Price/Volume metrics)
    if (data.datasets && Array.isArray(data.datasets)) {
      return parseIndianAPIChart(data);
    }

    // Alpha Vantage format (Time Series)
    if (
      data["Time Series (Daily)"] ||
      data["Weekly Time Series"] ||
      data["Monthly Time Series"]
    ) {
      return parseAlphaVantageChart(data);
    }

    // Finnhub format (arrays: c, h, l, o, t, v)
    if (data.c && data.t && Array.isArray(data.c) && Array.isArray(data.t)) {
      return parseFinnhubChart(data);
    }

    // Generic array format [{date, price, volume}, ...]
    if (Array.isArray(data)) {
      return parseGenericArrayChart(data);
    }

    // Generic object with arrays {dates: [], prices: [], volumes: []}
    if (
      data.dates &&
      data.prices &&
      Array.isArray(data.dates) &&
      Array.isArray(data.prices)
    ) {
      return parseGenericObjectChart(data);
    }

    return [];
  } catch (error) {
    console.error("Chart parsing error:", error);
    return [];
  }
}

// Smart table data detection - works with any array/object format
function autoDetectTableData(data: any): TableDataRow[] {
  try {
    // Direct array
    if (Array.isArray(data)) {
      return data;
    }

    // Indian API trending_stocks format
    if (data.trending_stocks) {
      // Combine top_gainers and top_losers into a single array
      const gainers = data.trending_stocks.top_gainers || [];
      const losers = data.trending_stocks.top_losers || [];
      return [...gainers, ...losers];
    }

    // Generic data wrapper
    if (data.data && Array.isArray(data.data)) {
      return data.data;
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
      if (data[prop] && Array.isArray(data[prop])) {
        return data[prop];
      }
    }

    // Time series to table conversion
    if (data["Time Series (Daily)"]) {
      return Object.entries(data["Time Series (Daily)"]).map(
        ([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values["1. open"]),
          high: parseFloat(values["2. high"]),
          low: parseFloat(values["3. low"]),
          close: parseFloat(values["4. close"]),
          volume: parseFloat(values["5. volume"]),
        })
      );
    }

    // Finnhub to table conversion
    if (data.c && data.t && Array.isArray(data.c)) {
      const { c, h, l, o, t, v } = data;
      return c.map((close: number, index: number) => {
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
      return [data];
    }

    return [];
  } catch (error) {
    console.error("Table parsing error:", error);
    return [];
  }
}

// Smart card data detection - extracts key metrics
function autoDetectCardData(data: any): CardData {
  try {
    // Array - take first item
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }

    // Indian API trending_stocks format - return summary stats
    if (data.trending_stocks) {
      const gainers = data.trending_stocks.top_gainers || [];
      const losers = data.trending_stocks.top_losers || [];
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
    if (data["Global Quote"]) {
      const quote = data["Global Quote"];
      return {
        symbol: quote["01. symbol"],
        open: parseFloat(quote["02. open"]),
        high: parseFloat(quote["03. high"]),
        low: parseFloat(quote["04. low"]),
        price: parseFloat(quote["05. price"]),
        volume: parseInt(quote["06. volume"]),
        "latest trading day": quote["07. latest trading day"],
        "previous close": parseFloat(quote["08. previous close"]),
        change: parseFloat(quote["09. change"]),
        "change percent": quote["10. change percent"],
      };
    }

    // Nested data.data pattern
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0];
    }

    // Time series - get latest data point
    const timeSeries =
      data["Time Series (Daily)"] ||
      data["Weekly Time Series"] ||
      data["Monthly Time Series"];
    if (timeSeries) {
      const latestDate = Object.keys(timeSeries).sort().reverse()[0];
      const latestData = timeSeries[latestDate];
      return {
        date: latestDate,
        price: parseFloat(latestData["4. close"]),
        open: parseFloat(latestData["1. open"]),
        high: parseFloat(latestData["2. high"]),
        low: parseFloat(latestData["3. low"]),
        volume: parseFloat(latestData["5. volume"]),
      };
    }

    // Finnhub - get latest data point
    if (data.c && data.t && Array.isArray(data.c)) {
      const { c, h, l, o, t, v } = data;
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
    return data || {};
  } catch (error) {
    console.error("Card parsing error:", error);
    return {};
  }
}

// Specific format parsers
function parseIndianAPIChart(data: any): ChartDataPoint[] {
  const datasets = data.datasets;
  const priceDataset = datasets.find((d: any) => d.metric === "Price");
  const volumeDataset = datasets.find((d: any) => d.metric === "Volume");
  const dma50Dataset = datasets.find((d: any) => d.metric === "DMA50");
  const dma200Dataset = datasets.find((d: any) => d.metric === "DMA200");

  if (!priceDataset) return [];

  return priceDataset.values.map((priceEntry: any, index: number) => {
    const [date, price] = priceEntry;
    const volumeEntry = volumeDataset?.values[index];
    const dma50Entry = dma50Dataset?.values[index];
    const dma200Entry = dma200Dataset?.values[index];

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

function parseAlphaVantageChart(data: any): ChartDataPoint[] {
  const timeSeries =
    data["Time Series (Daily)"] ||
    data["Weekly Time Series"] ||
    data["Monthly Time Series"];

  return Object.entries(timeSeries)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, values]: [string, any]) => ({
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

function parseFinnhubChart(data: any): ChartDataPoint[] {
  const { c, h, l, o, t, v } = data;

  return c.map((close: number, index: number) => {
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

function parseGenericArrayChart(data: any[]): ChartDataPoint[] {
  return data.map((item: any, index: number) => {
    const date = item.date || item.timestamp || item.time || `Day ${index + 1}`;
    const price = item.price || item.close || item.value || 0;

    return {
      date:
        typeof date === "string"
          ? new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : date,
      fullDate: typeof date === "string" ? date : `${date}`,
      price: parseFloat(price) || 0,
      volume: item.volume ? parseFloat(item.volume) : undefined,
      open: item.open ? parseFloat(item.open) : undefined,
      high: item.high ? parseFloat(item.high) : undefined,
      low: item.low ? parseFloat(item.low) : undefined,
      close: item.close ? parseFloat(item.close) : undefined,
    };
  });
}

function parseGenericObjectChart(data: any): ChartDataPoint[] {
  return data.prices.map((price: any, index: number) => ({
    date: data.dates?.[index] || `Day ${index + 1}`,
    fullDate: data.dates?.[index] || `${index}`,
    price: parseFloat(price) || 0,
    volume: data.volumes?.[index] ? parseFloat(data.volumes[index]) : undefined,
  }));
}
