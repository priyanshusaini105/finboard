/**
 * API Transformation Service
 * 
 * Automatically transforms raw API data into common schema format
 * This service is called whenever API data is fetched
 */

import { generateSchema } from './schemaGenerator';
import { DataTransformer } from './dataTransformer';
import type { FinancialDataset, ColumnDefinition } from './commonFinancialSchema';

export interface TransformedAPIResponse {
  success: boolean;
  useTransformedData: boolean;
  data: FinancialDataset;
  columns: ColumnDefinition[];
  error?: string;
}

/**
 * Detect API identifier from URL
 */
function detectApiIdentifier(apiUrl: string): string {
  if (apiUrl.includes('alphavantage')) {
    return 'alpha_vantage';
  }
  if (apiUrl.includes('indianapi')) {
    if (apiUrl.includes('historical')) {
      return 'indian_historical';
    }
    if (apiUrl.includes('trending')) {
      return 'indian_trending';
    }
    return 'indian_stock_api';
  }
  if (apiUrl.includes('finnhub')) {
    return 'finnhub';
  }
  
  // Generic identifier based on domain
  try {
    const url = new URL(apiUrl);
    return url.hostname.replace(/\./g, '_');
  } catch {
    return 'unknown_api';
  }
}

/**
 * Transform raw API data to common financial schema
 */
export async function transformApiData(
  rawData: unknown,
  apiUrl: string
): Promise<TransformedAPIResponse> {
  try {
    console.log(`🚀 [Transform Service] Starting transformation for URL: ${apiUrl}`);
    console.log(`📦 [Transform Service] Raw data structure:`, {
      type: typeof rawData,
      isArray: Array.isArray(rawData),
      keys: rawData && typeof rawData === 'object' ? Object.keys(rawData) : [],
      sample: JSON.stringify(rawData).substring(0, 300)
    });

    // Generate schema from raw data
    console.log('📊 [Transform Service] Generating schema...');
    const sourceSchema = generateSchema(rawData);
    
    console.log(`📋 [Transform Service] Generated schema:`, {
      fieldCount: sourceSchema?.fields ? Object.keys(sourceSchema.fields).length : 0,
      fields: sourceSchema?.fields ? Object.keys(sourceSchema.fields).slice(0, 10) : []
    });
    
    if (!sourceSchema || Object.keys(sourceSchema.fields).length === 0) {
      console.warn('⚠️ [Transform Service] Could not generate schema from data');
      return {
        success: false,
        useTransformedData: false,
        data: createEmptyDataset(),
        columns: [],
        error: 'Could not generate schema from API response',
      };
    }

    // Detect API identifier
    const apiIdentifier = detectApiIdentifier(apiUrl);
    console.log(`🔍 [Transform Service] Detected API: ${apiIdentifier}`);

    // Create transformer and transform data
    const transformer = new DataTransformer(sourceSchema, apiIdentifier);
    const transformedResponse = transformer.transform(rawData as Record<string, unknown>);

    console.log(`✨ [Transform Service] Transformation result:`, {
      success: transformedResponse.success,
      hasData: !!transformedResponse.data,
      rowCount: (transformedResponse.data as FinancialDataset)?.rows?.length,
      columnCount: (transformedResponse.data as FinancialDataset)?.columns?.length,
      error: transformedResponse.error,
      columns: (transformedResponse.data as FinancialDataset)?.columns?.map((c: ColumnDefinition) => ({ key: c.key, label: c.label, type: c.type }))
    });

    if (!transformedResponse.success) {
      console.error('❌ [Transform Service] Transformation failed:', transformedResponse.error);
      return {
        success: false,
        useTransformedData: false,
        data: createEmptyDataset(),
        columns: [],
        error: typeof transformedResponse.error === 'string' 
          ? transformedResponse.error 
          : transformedResponse.error?.message || 'Transformation failed',
      };
    }

    console.log(
      `✅ [Transform Service] Transformation successful: ${(transformedResponse.data as FinancialDataset).rows.length} rows, ${(transformedResponse.data as FinancialDataset).columns.length} columns`
    );

    return {
      success: true,
      useTransformedData: true,
      data: transformedResponse.data as FinancialDataset,
      columns: (transformedResponse.data as FinancialDataset).columns,
    };
  } catch (error) {
    console.error('❌ [Transform Service] Error during transformation:', error);
    return {
      success: false,
      useTransformedData: false,
      data: createEmptyDataset(),
      columns: [],
      error: error instanceof Error ? error.message : 'Unknown transformation error',
    };
  }
}

/**
 * Create an empty dataset for error cases
 */
function createEmptyDataset(): FinancialDataset {
  return {
    id: 'empty',
    title: 'No Data',
    dataType: 'time_series',
    columns: [],
    rows: [],
    totalRecords: 0,
  };
}

/**
 * Check if API should be transformed
 * (for now, transform all APIs except those explicitly excluded)
 */
export function shouldTransformApi(apiUrl: string): boolean {
  // Skip transformation for specific URLs if needed
  const skipPatterns: string[] = [
    '/quote?', // Finnhub quote API returns single object, no transformation needed
  ];

  return !skipPatterns.some(pattern => apiUrl.includes(pattern));
}
