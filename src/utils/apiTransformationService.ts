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
  rawData: any,
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
      name: sourceSchema?.name,
      type: sourceSchema?.type,
      fieldCount: sourceSchema?.fields ? Object.keys(sourceSchema.fields).length : 0,
      hasNested: !!sourceSchema?.nestedSchema,
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
    const transformedResponse = transformer.transform(rawData);

    console.log(`✨ [Transform Service] Transformation result:`, {
      success: transformedResponse.success,
      hasData: !!transformedResponse.data,
      rowCount: transformedResponse.data?.rows?.length,
      columnCount: transformedResponse.data?.columns?.length,
      error: transformedResponse.error,
      columns: transformedResponse.data?.columns?.map(c => ({ key: c.key, label: c.label, type: c.type }))
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
      `✅ [Transform Service] Transformation successful: ${transformedResponse.data.rows.length} rows, ${transformedResponse.data.columns.length} columns`
    );

    return {
      success: true,
      useTransformedData: true,
      data: transformedResponse.data,
      columns: transformedResponse.data.columns,
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
    // Add patterns to skip here if needed
  ];

  return !skipPatterns.some(pattern => apiUrl.includes(pattern));
}
