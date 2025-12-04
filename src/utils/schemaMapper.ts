/**
 * Schema-Driven Mapper
 * 
 * Uses generated API schema to intelligently map fields to common financial schema.
 * This eliminates manual mapping - the system learns the structure automatically.
 */

import { DataSchema, FieldSchema, FieldType } from './schemaGenerator';
import {
  PricePoint,
  ColumnDefinition,
} from './commonFinancialSchema';

// ============================================================================
// FIELD MAPPING RULES - How to identify fields by name/type
// ============================================================================

interface FieldMappingRule {
  targetField: string;
  sourcePatterns: string[]; // Case-insensitive patterns to match
  requiredType?: FieldType[]; // Expected types
  priority: number; // Higher = more specific match
}

const ENTITY_MAPPING_RULES: FieldMappingRule[] = [
  // Symbol identification
  { targetField: 'symbol', sourcePatterns: ['symbol', 'ticker', 'stock_symbol', 'ticker_id', 'code'], priority: 10 },
  { targetField: 'name', sourcePatterns: ['name', 'company_name', 'stock_name', 'security_name', 'description'], priority: 10 },
  
  // Exchange & identifiers
  { targetField: 'exchange', sourcePatterns: ['exchange', 'exchange_type', 'market', 'trading_exchange'], priority: 9 },
  { targetField: 'isin', sourcePatterns: ['isin'], priority: 10 },
  { targetField: 'cusip', sourcePatterns: ['cusip'], priority: 10 },
  { targetField: 'ric', sourcePatterns: ['ric'], priority: 10 },
  { targetField: 'tickerId', sourcePatterns: ['ticker_id', 'id', 'security_id'], priority: 8 },
  
  // Classification
  { targetField: 'sector', sourcePatterns: ['sector', 'industry_sector'], priority: 9 },
  { targetField: 'industry', sourcePatterns: ['industry', 'sub_industry'], priority: 9 },
  { targetField: 'currency', sourcePatterns: ['currency', 'currency_code'], priority: 9 },
  
  // Trading details
  { targetField: 'lotSize', sourcePatterns: ['lot_size', 'lotsize', 'min_lot'], requiredType: ['number'], priority: 9 },
];

const PRICE_MAPPING_RULES: FieldMappingRule[] = [
  // OHLCV data - numbered format (Alpha Vantage style)
  { targetField: 'open', sourcePatterns: ['open', '1. open', '1.open', 'opening_price'], requiredType: ['number', 'currency'], priority: 10 },
  { targetField: 'high', sourcePatterns: ['high', '2. high', '2.high', 'day_high', 'high_price'], requiredType: ['number', 'currency'], priority: 10 },
  { targetField: 'low', sourcePatterns: ['low', '3. low', '3.low', 'day_low', 'low_price'], requiredType: ['number', 'currency'], priority: 10 },
  { targetField: 'close', sourcePatterns: ['close', '4. close', '4.close', 'closing_price', 'last_price'], requiredType: ['number', 'currency'], priority: 10 },
  { targetField: 'volume', sourcePatterns: ['volume', '5. volume', '5.volume', 'trading_volume'], requiredType: ['number'], priority: 10 },
  
  // Current price
  { targetField: 'price', sourcePatterns: ['price', 'current_price', 'last', 'ltp', 'last_traded_price'], requiredType: ['number', 'currency'], priority: 10 },
  
  // Adjusted close
  { targetField: 'adjustedClose', sourcePatterns: ['adjusted_close', 'adjusted close', 'adj_close'], requiredType: ['number', 'currency'], priority: 9 },
];

const QUOTE_MAPPING_RULES: FieldMappingRule[] = [
  // Change metrics
  { targetField: 'change', sourcePatterns: ['change', 'net_change', 'price_change', 'absolute_change'], requiredType: ['number'], priority: 10 },
  { targetField: 'changePercent', sourcePatterns: ['change_percent', 'percent_change', 'change%', 'pct_change'], requiredType: ['number', 'percentage'], priority: 10 },
  
  // Bid/Ask
  { targetField: 'bid', sourcePatterns: ['bid', 'bid_price'], requiredType: ['number', 'currency'], priority: 10 },
  { targetField: 'ask', sourcePatterns: ['ask', 'ask_price', 'offer'], requiredType: ['number', 'currency'], priority: 10 },
  { targetField: 'bidSize', sourcePatterns: ['bid_size', 'bid_quantity'], requiredType: ['number'], priority: 9 },
  { targetField: 'askSize', sourcePatterns: ['ask_size', 'ask_quantity'], requiredType: ['number'], priority: 9 },
  
  // Circuit limits (Indian markets)
  { targetField: 'upperCircuitLimit', sourcePatterns: ['upper_circuit_limit', 'up_circuit_limit', 'upper_limit'], requiredType: ['number', 'currency'], priority: 9 },
  { targetField: 'lowerCircuitLimit', sourcePatterns: ['lower_circuit_limit', 'low_circuit_limit', 'lower_limit'], requiredType: ['number', 'currency'], priority: 9 },
  
  // 52-week range
  { targetField: 'week52High', sourcePatterns: ['52_week_high', '52week_high', 'year_high'], requiredType: ['number', 'currency'], priority: 9 },
  { targetField: 'week52Low', sourcePatterns: ['52_week_low', '52week_low', 'year_low'], requiredType: ['number', 'currency'], priority: 9 },
];

const TIME_MAPPING_RULES: FieldMappingRule[] = [
  { targetField: 'date', sourcePatterns: ['date', 'trading_date', 'timestamp', 'time'], requiredType: ['date', 'datetime'], priority: 10 },
  { targetField: 'time', sourcePatterns: ['time', 'trading_time'], requiredType: ['string', 'number'], priority: 9 },
];

const METADATA_MAPPING_RULES: FieldMappingRule[] = [
  { targetField: 'timezone', sourcePatterns: ['timezone', 'time zone', '5. time zone'], priority: 9 },
  { targetField: 'lastRefreshed', sourcePatterns: ['last_refreshed', 'last refreshed', '3. last refreshed', 'updated_at'], priority: 9 },
];

// ============================================================================
// MAPPING ENGINE
// ============================================================================

export class SchemaMapper {
  private sourceSchema: DataSchema;
  private apiIdentifier: string;

  constructor(sourceSchema: DataSchema, apiIdentifier: string = 'unknown') {
    this.sourceSchema = sourceSchema;
    this.apiIdentifier = apiIdentifier;
  }

  /**
   * Find matching field in source schema based on mapping rules
   */
  private findSourceField(
    rules: FieldMappingRule[],
    targetField: string,
    fields: Record<string, FieldSchema>
  ): { path: string; schema: FieldSchema } | null {
    let bestMatch: { path: string; schema: FieldSchema; priority: number } | null = null;

    const rule = rules.find(r => r.targetField === targetField);
    if (!rule) return null;

    // Search through all fields
    for (const [fieldName, fieldSchema] of Object.entries(fields)) {
      const lowerFieldName = fieldName.toLowerCase();

      // Check if field name matches any pattern
      const matchesPattern = rule.sourcePatterns.some(pattern =>
        lowerFieldName.includes(pattern.toLowerCase()) || 
        pattern.toLowerCase().includes(lowerFieldName)
      );

      if (!matchesPattern) continue;

      // Check type compatibility if specified
      if (rule.requiredType && !rule.requiredType.includes(fieldSchema.type)) {
        continue;
      }

      // Better match found?
      if (!bestMatch || rule.priority > bestMatch.priority) {
        bestMatch = { path: fieldName, schema: fieldSchema, priority: rule.priority };
      }
    }

    return bestMatch ? { path: bestMatch.path, schema: bestMatch.schema } : null;
  }

  /**
   * Extract entity info from schema
   */
  private mapEntityInfo(fields: Record<string, FieldSchema>): Record<string, string> {
    const entity: Record<string, string> = {};

    for (const rule of ENTITY_MAPPING_RULES) {
      const match = this.findSourceField([rule], rule.targetField, fields);
      if (match) {
        entity[rule.targetField] = `{{${match.path}}}`;
      }
    }

    return entity;
  }

  /**
   * Extract price data mapping
   */
  private mapPriceData(fields: Record<string, FieldSchema>): Record<string, string> {
    const price: Record<string, string> = {};

    // Map OHLCV fields
    for (const rule of PRICE_MAPPING_RULES) {
      const match = this.findSourceField([rule], rule.targetField, fields);
      if (match) {
        price[rule.targetField] = `{{${match.path}}}`;
      }
    }

    // Map time fields
    for (const rule of TIME_MAPPING_RULES) {
      const match = this.findSourceField([rule], rule.targetField, fields);
      if (match) {
        price[rule.targetField] = `{{${match.path}}}`;
      }
    }
    return price;
  }

  /**
   * Extract quote data mapping
   */
  private mapQuoteData(fields: Record<string, FieldSchema>): Record<string, string> {
    const quote: Record<string, string> = {
      ...this.mapPriceData(fields),
    };

    // Map quote-specific fields
    for (const rule of QUOTE_MAPPING_RULES) {
      const match = this.findSourceField([rule], rule.targetField, fields);
      if (match) {
        quote[rule.targetField] = `{{${match.path}}}`;
      }
    }

    return quote;
  }

  /**
   * Detect data structure type from schema
   */
  public detectDataStructure(): {
    type: 'time_series' | 'quote' | 'trending' | 'unknown';
    dataPath: string[];
    isArray: boolean;
  } {
    const fields = this.sourceSchema.dataFields || this.sourceSchema.fields;

    // Check for time series (date-keyed map or array with OHLCV)
    for (const [key, field] of Object.entries(fields)) {
      if (field.type === 'object' && field.objectSchema) {
        const innerKeys = Object.keys(field.objectSchema);
        
        // Check for [DATE] pattern (date-keyed map)
        if (innerKeys.includes('[DATE]')) {
          const dateFields = field.objectSchema['[DATE]'].objectSchema;
          if (dateFields && this.hasOHLCVFields(dateFields)) {
            return { type: 'time_series', dataPath: [key, '[DATE]'], isArray: false };
          }
        }

        // Check for nested objects (like trending_stocks)
        for (const [innerKey, innerField] of Object.entries(field.objectSchema)) {
          if (innerField.type === 'array' && innerField.objectSchema) {
            if (this.hasTrendingFields(innerField.objectSchema)) {
              return { type: 'trending', dataPath: [key, innerKey], isArray: true };
            }
            if (this.hasOHLCVFields(innerField.objectSchema)) {
              return { type: 'time_series', dataPath: [key, innerKey], isArray: true };
            }
          }
        }
      }

      // Check for array of objects with OHLCV
      if (field.type === 'array' && field.objectSchema) {
        if (this.hasOHLCVFields(field.objectSchema)) {
          return { type: 'time_series', dataPath: [key], isArray: true };
        }
        
        // Check for trending stocks (has price + change)
        if (this.hasTrendingFields(field.objectSchema)) {
          return { type: 'trending', dataPath: [key], isArray: true };
        }

        // Check for datasets with tuples (Indian API style)
        if (field.arrayItemType === 'object' && field.objectSchema['values']) {
          const valuesField = field.objectSchema['values'];
          if (valuesField.tupleTypes) {
            return { type: 'time_series', dataPath: [key], isArray: true };
          }
        }
      }
    }

    // Check for single quote object
    if (this.hasQuoteFields(fields)) {
      return { type: 'quote', dataPath: [], isArray: false };
    }

    return { type: 'unknown', dataPath: [], isArray: false };
  }

  private hasOHLCVFields(fields: Record<string, FieldSchema>): boolean {
    const requiredFields = ['open', 'high', 'low', 'close', 'volume'];
    let matchCount = 0;
    for (const key of Object.keys(fields)) {
      const lowerKey = key.toLowerCase();
      if (requiredFields.some(req => lowerKey.includes(req))) {
        matchCount++;
      }
    }

    return matchCount >= 4; // At least 4 out of 5 OHLCV fields
  }

  private hasQuoteFields(fields: Record<string, FieldSchema>): boolean {
    const quoteFields = ['price', 'bid', 'ask', 'change', 'volume'];
    let matchCount = 0;

    for (const key of Object.keys(fields)) {
      const lowerKey = key.toLowerCase();
      if (quoteFields.some(qf => lowerKey.includes(qf))) {
        matchCount++;
      }
    }

    return matchCount >= 2;
  }

  private hasTrendingFields(fields: Record<string, FieldSchema>): boolean {
    const trendingFields = ['price', 'change', 'percent_change', 'company_name', 'ticker'];
    let matchCount = 0;

    for (const key of Object.keys(fields)) {
      const lowerKey = key.toLowerCase();
      if (trendingFields.some(tf => lowerKey.includes(tf))) {
        matchCount++;
      }
    }

    return matchCount >= 3;
  }

  /**
   * Generate field mapping template
   * Returns a mapping object that shows: targetField -> sourceFieldPath
   */
  public generateMappingTemplate(): {
    dataType: string;
    dataPath: string[];
    entityMapping: Record<string, string>;
    priceMapping: Record<string, string>;
    quoteMapping?: Record<string, string>;
    metadataMapping: Record<string, string>;
  } {
    const structure = this.detectDataStructure();
    const fields = this.sourceSchema.dataFields || this.sourceSchema.fields;

    // Get the actual data fields (drill down to the data level)
    let dataFields = fields;
    for (const pathSegment of structure.dataPath) {
      if (pathSegment === '[DATE]') continue; // Skip date key - use its objectSchema
      
      const segmentField = dataFields[pathSegment];
      if (!segmentField) break;

      // For [DATE] pattern, get its objectSchema
      if (segmentField.objectSchema && segmentField.objectSchema['[DATE]']) {
        dataFields = segmentField.objectSchema['[DATE]'].objectSchema || segmentField.objectSchema;
      } else if (segmentField.objectSchema) {
        dataFields = segmentField.objectSchema;
      }
    }

    const entityMapping = this.extractMappingPaths(this.mapEntityInfo(dataFields));
    const priceMapping = this.extractMappingPaths(this.mapPriceData(dataFields));
    const quoteMapping = structure.type === 'quote' || structure.type === 'trending' 
      ? this.extractMappingPaths(this.mapQuoteData(dataFields))
      : undefined;

    // Extract metadata from metadata fields
    const metadataFields = this.sourceSchema.metadata || {};
    const metadataMapping: Record<string, string> = {};
    
    // Also check for metadata in top-level fields
    const allMetadataFields = { ...metadataFields };
    for (const [key, field] of Object.entries(fields)) {
      if (field.type === 'object' && field.objectSchema && key.toLowerCase().includes('meta')) {
        Object.assign(allMetadataFields, field.objectSchema);
      }
    }
    
    for (const rule of METADATA_MAPPING_RULES) {
      const match = this.findSourceField([rule], rule.targetField, allMetadataFields);
      if (match) {
        metadataMapping[rule.targetField] = match.path;
      }
    }

    return {
      dataType: structure.type,
      dataPath: structure.dataPath,
      entityMapping,
      priceMapping,
      quoteMapping,
      metadataMapping,
    };
  }

<<<<<<< HEAD
  private extractMappingPaths(obj: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        result[key] = value.slice(2, -2); // Remove {{ }}
      }
    }

    return result;
  }

  /**
   * Generate column definitions for table display
   */
  public generateColumnDefinitions(): ColumnDefinition[] {
    const mapping = this.generateMappingTemplate();
    const columns: ColumnDefinition[] = [];

    // Combine all mappings
    const allMappings = {
      ...mapping.entityMapping,
      ...mapping.priceMapping,
      ...(mapping.quoteMapping || {}),
    };

    for (const [targetField] of Object.entries(allMappings)) {
      const column: ColumnDefinition = {
        key: targetField,
        label: this.formatLabel(targetField),
        type: this.inferColumnType(targetField),
        sortable: true,
        filterable: true,
      };

      // Set alignment based on type
      if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') {
        column.align = 'right';
      } else if (column.type === 'date' || column.type === 'datetime') {
        column.align = 'center';
      } else {
        column.align = 'left';
      }

      columns.push(column);
    }

    return columns;
  }

  private formatLabel(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  private inferColumnType(field: string): ColumnDefinition['type'] {
    if (field.includes('date') || field.includes('Date')) return 'date';
    if (field.includes('time') || field.includes('Time')) return 'datetime';
    if (field.includes('percent') || field.includes('Percent')) return 'percentage';
    if (['price', 'open', 'high', 'low', 'close', 'bid', 'ask'].includes(field)) return 'currency';
    if (['volume', 'change', 'lotSize', 'bidSize', 'askSize'].includes(field)) return 'number';
    return 'string';
  }
}
