/**
 * Data Transformer
 * 
 * Transforms raw API data into common financial schema format
 * using the generated mapping template.
 */

import { DataSchema } from './schemaGenerator';
import { SchemaMapper } from './schemaMapper';
import {
  FinancialDataset,
  ColumnDefinition,
  TransformationMetadata,
  FinancialDataResponse,
} from './commonFinancialSchema';

export class DataTransformer {
  private mapper: SchemaMapper;
  private sourceSchema: DataSchema;
  private apiIdentifier: string;

  constructor(sourceSchema: DataSchema, apiIdentifier: string) {
    this.sourceSchema = sourceSchema;
    this.apiIdentifier = apiIdentifier;
    this.mapper = new SchemaMapper(sourceSchema, apiIdentifier);
  }

  /**
   * Main transformation function
   */
  public transform(rawData: unknown): FinancialDataResponse<FinancialDataset> {
    const startTime = Date.now();
    const structure = this.mapper.detectDataStructure();
    const mapping = this.mapper.generateMappingTemplate();

    let transformedData: Record<string, unknown>;
    let recordsProcessed = 0;
    let recordsSuccessful = 0;

    try {
      switch (structure.type) {
        case 'time_series':
          transformedData = this.transformTimeSeries(rawData, structure, mapping);
          break;
        case 'trending':
          transformedData = this.transformTrending(rawData, structure, mapping);
          break;
        case 'quote':
          transformedData = this.transformQuote(rawData, structure, mapping);
          break;
        default:
          throw new Error(`Unsupported data type: ${structure.type}`);
      }

      recordsProcessed = transformedData.rows.length;
      recordsSuccessful = transformedData.rows.length;

      const metadata: TransformationMetadata = {
        sourceApi: this.apiIdentifier,
        sourceEndpoint: 'N/A',
        sourceSchema: '1.0',
        transformedAt: new Date().toISOString(),
        transformationVersion: '1.0.0',
        fieldMappings: {
          ...mapping.entityMapping,
          ...mapping.priceMapping,
          ...(mapping.quoteMapping || {}),
        },
        recordsProcessed,
        recordsSuccessful,
        recordsFailed: recordsProcessed - recordsSuccessful,
      };

      return {
        success: true,
        data: transformedData,
        metadata,
        responseTime: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        data: {} as FinancialDataset,
        metadata: {
          sourceApi: this.apiIdentifier,
          sourceEndpoint: 'N/A',
          sourceSchema: '1.0',
          transformedAt: new Date().toISOString(),
          transformationVersion: '1.0.0',
          fieldMappings: {},
          recordsProcessed: 0,
          recordsSuccessful: 0,
          recordsFailed: 0,
          errors: [errorMessage],
        },
        error: {
          code: 'TRANSFORMATION_ERROR',
          message: errorMessage,
          details: error,
        },
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Transform time series data
   */
  private transformTimeSeries(
    rawData: unknown,
    structure: { type: string; dataPath: string[]; isArray: boolean },
    mapping: Record<string, unknown>
  ): FinancialDataset {
    const rows: Record<string, unknown>[] = [];
    let columns: ColumnDefinition[] = [];

    // Navigate to data
    let data: unknown = rawData;
    for (const pathSegment of structure.dataPath) {
      if (pathSegment === '[DATE]') continue;
      data = (data as Record<string, unknown>)[pathSegment];
    }

    // Handle date-keyed map (Alpha Vantage style)
    if (structure.dataPath.includes('[DATE]')) {
      for (const [date, values] of Object.entries(data as Record<string, unknown>)) {
        const row = this.extractFields(values, mapping);
        row.date = date;
        row.timestamp = date;
        rows.push(row);
      }
    }
    // Handle array of objects
    else if (Array.isArray(data)) {
      // Check if this is Indian API format with datasets
      const hasDatasets = data.some((item: unknown) => 
        typeof item === 'object' && item !== null && 'values' in item && Array.isArray((item as Record<string, unknown>).values)
      );
      
      if (hasDatasets) {
        // Indian API: Pivot data - combine all metrics for each date into single row
        const dateMap = new Map<string, Record<string, unknown>>();
        
        for (const item of data) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.values && Array.isArray(itemObj.values) && itemObj.values.length > 0) {
            const metricName = String(itemObj.metric || itemObj.label || 'Value').toLowerCase();
            
            for (const tuple of item.values as unknown[]) {
              if (Array.isArray(tuple) && tuple.length >= 2) {
                const date = tuple[0] as string;
                const value = parseFloat(tuple[1] as string);
                
                // Get or create row for this date
                if (!dateMap.has(date)) {
                  dateMap.set(date, {
                    date: date,
                    timestamp: date,
                  });
                }
                
                // Add metric value to the row
                const row = dateMap.get(date)!;
                row[metricName] = value;
              }
            }
          }
        }
        
        // Convert map to array
        rows.push(...Array.from(dateMap.values()));
      } else {
        // Regular array of objects with OHLCV
        for (const item of data as unknown[]) {
          const row = this.extractFields(item, mapping);
          rows.push(row);
        }
      }
    }

    // Generate columns from actual data if rows exist
    if (rows.length > 0) {
      const allKeys = new Set<string>();
      rows.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
      });

      // Create column definitions for all fields found in rows
      const dataColumns: ColumnDefinition[] = [];
      allKeys.forEach(key => {
        // Skip if already in columns
        if (columns.some(c => c.key === key)) return;

        // Infer column type from first non-null value
        let type: ColumnDefinition['type'] = 'string';
        const sampleValue = rows.find(r => r[key] != null)?.[key];
        
        if (typeof sampleValue === 'number') {
          if (key.includes('price') || key.includes('open') || key.includes('high') || 
              key.includes('low') || key.includes('close') || key.includes('bid') || key.includes('ask')) {
            type = 'currency';
          } else if (key.includes('percent') || key.includes('change')) {
            type = 'percentage';
          } else {
            type = 'number';
          }
        } else if (key.includes('date') || key.includes('time')) {
          type = 'date';
        }

        dataColumns.push({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          type,
          align: type === 'currency' || type === 'number' || type === 'percentage' ? 'right' : 
                 type === 'date' ? 'center' : 'left',
          sortable: true,
          filterable: true,
        });
      });

      // Merge generated columns with mapped columns, preferring generated
      columns = [...dataColumns];
    }

    // Add metadata columns if not already present
    if (!columns.find(c => c.key === 'date')) {
      columns.unshift({
        key: 'date',
        label: 'Date',
        type: 'date',
        align: 'center',
        sortable: true,
        filterable: true,
      });
    }

    return {
      id: `${this.apiIdentifier}_${Date.now()}`,
      title: `Time Series - ${this.apiIdentifier}`,
      dataType: 'time_series',
      columns,
      rows,
      totalRecords: rows.length,
      source: this.apiIdentifier,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Transform trending/market movers data
   */
  private transformTrending(
<<<<<<< HEAD
    rawData: unknown,
    structure: { type: string; dataPath: string[]; isArray: boolean },
    mapping: Record<string, unknown>
  ): FinancialDataset {
    const rows: Record<string, unknown>[] = [];
=======
    rawData: Record<string, unknown>,
    structure: Record<string, unknown>,
    mapping: Record<string, unknown>
  ): Record<string, unknown> {
    const rows: Array<Record<string, unknown>> = [];
>>>>>>> 7f0d78f (feat: Implement real-time data handling with WebSocket integration)
    const columns = this.mapper.generateColumnDefinitions();

    // Navigate to data
    let data: unknown = rawData;
<<<<<<< HEAD
    for (const pathSegment of structure.dataPath) {
      data = (data as Record<string, unknown>)[pathSegment];
    }

    if (Array.isArray(data)) {
      for (const item of data as unknown[]) {
        const row = this.extractFields(item, mapping);
=======
    for (const pathSegment of (structure.dataPath as string[])) {
      data = (data as Record<string, unknown>)[pathSegment] as unknown;
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        const row = this.extractFields(item as Record<string, unknown>, mapping as Record<string, unknown>);
>>>>>>> 7f0d78f (feat: Implement real-time data handling with WebSocket integration)
        rows.push(row);
      }
    }

    return {
      id: `${this.apiIdentifier}_${Date.now()}`,
      title: `Trending Stocks - ${this.apiIdentifier}`,
      dataType: 'trending',
      columns,
      rows,
      totalRecords: rows.length,
      source: this.apiIdentifier,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Transform single quote data
   */
  private transformQuote(
<<<<<<< HEAD
    rawData: unknown,
    structure: { type: string; dataPath: string[]; isArray: boolean },
    mapping: Record<string, unknown>
  ): FinancialDataset {
    const row = this.extractFields(rawData, mapping);
=======
    rawData: Record<string, unknown>,
    structure: Record<string, unknown>,
    mapping: Record<string, unknown>
  ): Record<string, unknown> {
    const row = this.extractFields(rawData, mapping as Record<string, unknown>);
>>>>>>> 7f0d78f (feat: Implement real-time data handling with WebSocket integration)
    const columns = this.mapper.generateColumnDefinitions();

    return {
      id: `${this.apiIdentifier}_${Date.now()}`,
      title: `Quote - ${this.apiIdentifier}`,
      dataType: 'quote',
      columns,
      rows: [row],
      totalRecords: 1,
      source: this.apiIdentifier,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract fields from source object using mapping
   */
<<<<<<< HEAD
  private extractFields(sourceObj: unknown, mapping: Record<string, unknown>): Record<string, unknown> {
=======
  private extractFields(sourceObj: Record<string, unknown>, mapping: Record<string, unknown>): Record<string, unknown> {
>>>>>>> 7f0d78f (feat: Implement real-time data handling with WebSocket integration)
    const result: Record<string, unknown> = {};

    const mappingObj = mapping as { entityMapping?: Record<string, string>; priceMapping?: Record<string, string>; quoteMapping?: Record<string, string> };
    const allMappings = {
      ...(mappingObj.entityMapping || {}),
      ...(mappingObj.priceMapping || {}),
      ...(mappingObj.quoteMapping || {}),
    };

    for (const [targetField, sourcePath] of Object.entries(allMappings)) {
      let value = this.getNestedValue(sourceObj, sourcePath as string);
      
      // If value not found, try fuzzy matching for Alpha Vantage style fields
      // e.g., "open" should match "1. open", "2. high" etc.
      if ((value === undefined || value === null) && typeof sourcePath === 'string' && typeof sourceObj === 'object' && sourceObj !== null) {
        const targetName = sourcePath.split('.').pop()?.toLowerCase() || '';
        
        // Search for field with matching suffix (case-insensitive)
        for (const [key, val] of Object.entries(sourceObj as Record<string, unknown>)) {
          const keyLower = key.toLowerCase();
          // Match if the key ends with the target field name
          // e.g., "1. open" matches "open", "4. close" matches "close"
          if (keyLower.endsWith(targetName) || keyLower.includes(targetName)) {
            value = val;
            break;
          }
        }
      }
      
      if (value !== undefined && value !== null) {
        // Convert string numbers to actual numbers
        if (typeof value === 'string' && !isNaN(parseFloat(value))) {
          result[targetField] = parseFloat(value);
        } else {
          result[targetField] = value;
        }
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
<<<<<<< HEAD
  private getNestedValue(obj: unknown, path: string): unknown {
=======
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
>>>>>>> 7f0d78f (feat: Implement real-time data handling with WebSocket integration)
    if (!path) return undefined;
    
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
<<<<<<< HEAD
=======

  /**
   * Infer change direction from change value
   */
  private inferChangeDirection(change: number): string {
    if (change > 0) return 'UP';
    if (change < 0) return 'DOWN';
    return 'UNCHANGED';
  }
>>>>>>> 7f0d78f (feat: Implement real-time data handling with WebSocket integration)
}
