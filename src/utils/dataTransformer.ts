/**
 * Data Transformer
 * 
 * Transforms raw API data into common financial schema format
 * using the generated mapping template.
 */

import { DataSchema, FieldSchema } from './schemaGenerator';
import { SchemaMapper } from './schemaMapper';
import {
  EntityInfo,
  EntityType,
  PricePoint,
  Quote,
  TimeSeries,
  TrendingItem,
  FinancialDataset,
  ColumnDefinition,
  ChangeDirection,
  TimeframeType,
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
  public transform(rawData: any): FinancialDataResponse<FinancialDataset> {
    const startTime = Date.now();
    const structure = this.mapper.detectDataStructure();
    const mapping = this.mapper.generateMappingTemplate();

    let transformedData: FinancialDataset;
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
    } catch (error: any) {
      return {
        success: false,
        data: {} as any,
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
          errors: [error.message],
        },
        error: {
          code: 'TRANSFORMATION_ERROR',
          message: error.message,
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
    rawData: any,
    structure: any,
    mapping: any
  ): FinancialDataset {
    const rows: any[] = [];
    const columns = this.mapper.generateColumnDefinitions();

    // Navigate to data
    let data = rawData;
    for (const pathSegment of structure.dataPath) {
      if (pathSegment === '[DATE]') continue;
      data = data[pathSegment];
    }

    // Handle date-keyed map (Alpha Vantage style)
    if (structure.dataPath.includes('[DATE]')) {
      for (const [date, values] of Object.entries(data)) {
        const row = this.extractFields(values, mapping);
        row.date = date;
        row.timestamp = date;
        rows.push(row);
      }
    }
    // Handle array of objects
    else if (Array.isArray(data)) {
      for (const item of data) {
        // Handle datasets with tuples (Indian API)
        if (item.values && Array.isArray(item.values) && item.values.length > 0) {
          const metricName = item.metric || item.label || 'Value';
          
          for (const tuple of item.values) {
            if (Array.isArray(tuple) && tuple.length >= 2) {
              const row: any = {
                date: tuple[0],
                timestamp: tuple[0],
                [metricName.toLowerCase()]: parseFloat(tuple[1]),
                metric: metricName,
              };
              rows.push(row);
            }
          }
        } else {
          // Regular array of objects with OHLCV
          const row = this.extractFields(item, mapping);
          rows.push(row);
        }
      }
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
    rawData: any,
    structure: any,
    mapping: any
  ): FinancialDataset {
    const rows: any[] = [];
    const columns = this.mapper.generateColumnDefinitions();

    // Navigate to data
    let data = rawData;
    for (const pathSegment of structure.dataPath) {
      data = data[pathSegment];
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        const row = this.extractFields(item, mapping);
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
    rawData: any,
    structure: any,
    mapping: any
  ): FinancialDataset {
    const row = this.extractFields(rawData, mapping);
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
  private extractFields(sourceObj: any, mapping: any): any {
    const result: any = {};

    const allMappings = {
      ...mapping.entityMapping,
      ...mapping.priceMapping,
      ...(mapping.quoteMapping || {}),
    };

    for (const [targetField, sourcePath] of Object.entries(allMappings)) {
      const value = this.getNestedValue(sourceObj, sourcePath as string);
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
  private getNestedValue(obj: any, path: string): any {
    if (!path) return undefined;
    
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Infer change direction from change value
   */
  private inferChangeDirection(change: number): ChangeDirection {
    if (change > 0) return ChangeDirection.UP;
    if (change < 0) return ChangeDirection.DOWN;
    return ChangeDirection.UNCHANGED;
  }
}
