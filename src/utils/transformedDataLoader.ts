/**
 * Loader for transformed API data from common schema
 * Uses pre-transformed JSON files from api_mappings directory
 */

import type { FinancialDataset, ColumnDefinition } from './commonFinancialSchema';
import type { ChartDataPoint } from './websocketAdapter';

interface TransformedDataResponse {
  success: boolean;
  data: FinancialDataset;
  error?: string;
  metadata?: {
    apiName: string;
    transformedAt: string;
    sourceUrl: string;
  };
}

// Map API URLs to their transformed data file names
const API_TO_FILE_MAP: Record<string, string> = {
  // Alpha Vantage
  'alphavantage.co': 'alpha_vantage_ibm_transformed.json',
  'TIME_SERIES_DAILY': 'alpha_vantage_ibm_transformed.json',
  
  // Indian Stock API
  'stock.indianapi.in/historical': 'indian_historical_reliance_transformed.json',
  'stock.indianapi.in/trending': 'indian_trending_transformed.json',
  'historical_data': 'indian_historical_reliance_transformed.json',
  'trending': 'indian_trending_transformed.json',
};

/**
 * Detect which transformed file to use based on API URL
 */
export function detectTransformedFile(apiUrl: string): string | null {
  if (!apiUrl) return null;

  // Try exact URL pattern matches
  for (const [pattern, filename] of Object.entries(API_TO_FILE_MAP)) {
    if (apiUrl.includes(pattern)) {
      return filename;
    }
  }

  // Fallback: extract API identifier from URL
  if (apiUrl.includes('alphavantage')) {
    return 'alpha_vantage_ibm_transformed.json';
  }
  if (apiUrl.includes('indianapi')) {
    if (apiUrl.includes('historical')) {
      return 'indian_historical_reliance_transformed.json';
    }
    if (apiUrl.includes('trending')) {
      return 'indian_trending_transformed.json';
    }
  }

  return null;
}

/**
 * Load transformed data from JSON file
 */
export async function loadTransformedData(apiUrl: string): Promise<TransformedDataResponse> {
  const filename = detectTransformedFile(apiUrl);
  
  if (!filename) {
    return {
      success: false,
      error: `No transformed data file found for API: ${apiUrl}`,
      data: {
        id: 'unknown',
        title: 'Unknown',
        dataType: 'time_series',
        columns: [],
        rows: [],
        totalRecords: 0,
      },
    };
  }

  try {
    // Load from api_mappings directory
    const response = await fetch(`/api_mappings/${filename}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load transformed data: ${response.statusText}`);
    }

    const transformedResponse = await response.json() as TransformedDataResponse;
    
    if (!transformedResponse.success) {
      throw new Error(transformedResponse.error || 'Transformation failed');
    }

    return transformedResponse;
  } catch (error) {
    console.error('[Transformed Data Loader] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error loading transformed data',
      data: {
        id: 'error',
        title: 'Error',
        dataType: 'time_series',
        columns: [],
        rows: [],
        totalRecords: 0,
      },
    };
  }
}

/**
 * Extract column definitions from transformed data
 */
export function getColumnsFromTransformedData(data: FinancialDataset): ColumnDefinition[] {
  return data.columns || [];
}

/**
 * Extract rows from transformed data
 */
export function getRowsFromTransformedData(data: FinancialDataset): Record<string, unknown>[] {
  return data.rows || [];
}

/**
 * Get table-ready data structure
 */
export interface TableData {
  columns: ColumnDefinition[];
  rows: Record<string, unknown>[];
  metadata: {
    totalRecords: number;
    dataQuality: string;
    lastUpdated: string;
  };
}

export function getTableData(dataset: FinancialDataset): TableData {
  return {
    columns: dataset.columns,
    rows: dataset.rows,
    metadata: {
      totalRecords: dataset.totalRecords || dataset.rows.length,
      dataQuality: 'high',
      lastUpdated: dataset.generatedAt || new Date().toISOString(),
    },
  };
}

/**
 * Get chart-ready data structure
 */
// Re-export ChartDataPoint from websocketAdapter for consistency
export type { ChartDataPoint } from './websocketAdapter';

export function getChartData(dataset: FinancialDataset): ChartDataPoint[] {
  // For time series data
  if (dataset.dataType === 'time_series') {
    return dataset.rows.map((row) => {
      // Extract date field
      const dateField = dataset.columns.find(c => c.type === 'date' || c.type === 'datetime')?.key || 'date';
      const fullDate = (row[dateField] as string) || new Date().toISOString();

      return {
        date: fullDate ? new Date(fullDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        fullDate: fullDate,
        price: (row.price || row.close || row.adjustedClose) as number || 0,
        open: row.open as number,
        high: row.high as number,
        low: row.low as number,
        close: row.close as number,
        volume: row.volume as number,
      };
    });
  }

  // For other data types, return as-is
  return dataset.rows.map((row, index) => ({
    date: `Point ${index + 1}`,
    fullDate: new Date().toISOString(),
    price: (row.price || row.close || row.value) as number || 0,
  }));
}

/**
 * Get card-ready data structure
 */
export interface CardData {
  [key: string]: unknown;
}

export function getCardData(dataset: FinancialDataset): CardData {
  // For card view, return the first row or summary stats
  if (dataset.rows.length === 0) {
    return {};
  }

  // If it's a single entity (quote), return first row
  if (dataset.dataType === 'quote' || dataset.rows.length === 1) {
    return dataset.rows[0];
  }

  // For time series, return the latest data point
  if (dataset.dataType === 'time_series') {
    const sortedRows = [...dataset.rows].sort((a, b) => {
      const dateField = dataset.columns.find(c => c.type === 'date' || c.type === 'datetime')?.key || 'date';
      const dateA = new Date(a[dateField] as string).getTime();
      const dateB = new Date(b[dateField] as string).getTime();
      return dateB - dateA; // Most recent first
    });
    return sortedRows[0];
  }

  // For trending data, return summary
  return {
    totalRecords: dataset.rows.length,
    dataType: dataset.dataType,
    ...dataset.rows[0],
  };
}
