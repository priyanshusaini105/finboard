// API Schema Generator - Creates GraphQL-like schema from API responses

export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'currency'
  | 'percentage'
  | 'array'
  | 'object'
  | 'null';

export interface FieldSchema {
  name: string;
  type: FieldType;
  originalType?: string;
  isNullable?: boolean;
  arrayItemType?: FieldType;
  objectSchema?: Record<string, FieldSchema>;
  description?: string;
  tupleTypes?: FieldType[]; // For tuple arrays like [date, number]
}

export interface DataSchema {
  rootType: 'object' | 'array';
  fields: Record<string, FieldSchema>;
  metadata?: Record<string, FieldSchema>; // Metadata fields (excluded from main schema)
  dataFields?: Record<string, FieldSchema>; // Actual data fields
}

// Patterns for type detection
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
  /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
];

const DATETIME_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/, // YYYY-MM-DD HH:MM:SS
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
];

const TIMESTAMP_PATTERNS = [
  /^\d{10}$/, // Unix timestamp (seconds)
  /^\d{13}$/, // Unix timestamp (milliseconds)
];

const PERCENTAGE_PATTERNS = [
  /^-?\d+\.?\d*%$/, // 10.5%
  /^-?\d+\.?\d*\s?percent/, // 10.5 percent
];

// Common metadata field names (case-insensitive)
const METADATA_FIELDS = [
  'meta data',
  'metadata',
  'meta',
  'information',
  'note',
  'notes',
  'message',
  'status',
  'api version',
  'version',
  'timestamp',
  'request time',
  'response time',
  'time zone',
  'timezone',
  'last refreshed',
  'last updated',
];

function isMetadataField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return METADATA_FIELDS.some(pattern => lower.includes(pattern));
}

function detectFieldType(value: unknown, fieldName: string): FieldType {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'string') {
    const str = value.trim();

    // Check for percentage
    if (PERCENTAGE_PATTERNS.some(p => p.test(str))) {
      return 'percentage';
    }

    // Check for datetime
    if (DATETIME_PATTERNS.some(p => p.test(str))) {
      return 'datetime';
    }

    // Check for date
    if (DATE_PATTERNS.some(p => p.test(str))) {
      return 'date';
    }

    // Check for timestamp
    if (TIMESTAMP_PATTERNS.some(p => p.test(str))) {
      return 'timestamp';
    }

    // Check for currency (in financial context)
    if (fieldName.toLowerCase().includes('price') || 
        fieldName.toLowerCase().includes('open') ||
        fieldName.toLowerCase().includes('close') ||
        fieldName.toLowerCase().includes('high') ||
        fieldName.toLowerCase().includes('low')) {
      if (!isNaN(parseFloat(str))) {
        return 'currency';
      }
    }

    // Check if it's a number string
    if (!isNaN(parseFloat(str)) && isFinite(parseFloat(str))) {
      return 'number';
    }

    return 'string';
  }

  return 'string';
}

function analyzeArrayItems(arr: unknown[]): { itemType: FieldType; itemSchema?: FieldSchema; tupleTypes?: FieldType[] } {
  if (arr.length === 0) return { itemType: 'null' };
  
  const firstItem = arr[0];
  const itemType = detectFieldType(firstItem, '');
  
  // Check if all items have the same type
  const allSameType = arr.every(item => 
    detectFieldType(item, '') === itemType
  );
  
  const resultType = allSameType ? itemType : 'object';
  
  // If array contains objects or arrays, analyze structure
  if (resultType === 'object' && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
    const analyzed = analyzeObject(firstItem as Record<string, unknown>, 'item');
    return { itemType: resultType, itemSchema: analyzed };
  } else if (resultType === 'array' && Array.isArray(firstItem)) {
    // Check if this is a tuple (fixed-length array with mixed types)
    const innerAnalysis = analyzeArrayItems(firstItem);
    
    // Detect tuple: check if inner array has consistent length and detect types of each position
    const isTuple = arr.every((item: unknown) => Array.isArray(item) && item.length === firstItem.length);
    
    if (isTuple && firstItem.length <= 10) {
      // Analyze each position in the tuple
      const tupleTypes: FieldType[] = [];
      for (let i = 0; i < firstItem.length; i++) {
        const positionTypes = new Set<FieldType>();
        arr.slice(0, Math.min(10, arr.length)).forEach((item: unknown) => {
          if (Array.isArray(item) && item[i] !== undefined) {
            positionTypes.add(detectFieldType(item[i], `position_${i}`));
          }
        });
        // If all same type at this position, use that type, otherwise 'object'
        tupleTypes.push(positionTypes.size === 1 ? Array.from(positionTypes)[0] : 'object');
      }
      
      return { 
        itemType: resultType, 
        tupleTypes,
        itemSchema: {
          name: 'item',
          type: 'array',
          description: `Tuple: [${tupleTypes.join(', ')}]`,
          isNullable: false,
        }
      };
    }
    
    return { 
      itemType: resultType, 
      itemSchema: {
        name: 'item',
        type: 'array',
        arrayItemType: innerAnalysis.itemType,
        objectSchema: innerAnalysis.itemSchema?.objectSchema,
        isNullable: false,
      }
    };
  }
  
  return { itemType: resultType };
}

function analyzeObject(obj: Record<string, unknown>, fieldName: string): FieldSchema {
  const objectSchema: Record<string, FieldSchema> = {};
  
  // Detect if object has date-like keys (time series data)
  const keys = Object.keys(obj);
  const hasDateKeys = keys.length > 5 && keys.some(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
  
  if (hasDateKeys) {
    // For time series data, show pattern instead of literal dates
    const firstValue = obj[keys[0]];
    const valueSchema = analyzeField('[DATE]', firstValue);
    
    objectSchema['[DATE]'] = {
      ...valueSchema,
      name: '[DATE]',
      description: `Date-keyed map (${keys.length} entries: ${keys[0]} ... ${keys[keys.length - 1]})`,
    };
  } else {
    // Regular object - analyze all fields
    for (const [key, value] of Object.entries(obj)) {
      objectSchema[key] = analyzeField(key, value);
    }
  }

  return {
    name: fieldName,
    type: 'object',
    objectSchema,
  };
}

function analyzeField(fieldName: string, value: unknown): FieldSchema {
  const type = detectFieldType(value, fieldName);
  const schema: FieldSchema = {
    name: fieldName,
    type,
    isNullable: value === null || value === undefined,
  };

  if (type === 'array' && Array.isArray(value)) {
    const arrayAnalysis = analyzeArrayItems(value);
    schema.arrayItemType = arrayAnalysis.itemType;
    
    if (arrayAnalysis.tupleTypes) {
      schema.tupleTypes = arrayAnalysis.tupleTypes;
      schema.description = `Tuple: [${arrayAnalysis.tupleTypes.join(', ')}]`;
    } else if (arrayAnalysis.itemSchema) {
      schema.objectSchema = arrayAnalysis.itemSchema.objectSchema;
      if (arrayAnalysis.itemSchema.description) {
        schema.description = arrayAnalysis.itemSchema.description;
      } else if (arrayAnalysis.itemSchema.arrayItemType) {
        schema.description = `Array of ${arrayAnalysis.itemType} (items are ${arrayAnalysis.itemSchema.arrayItemType})`;
      }
    }
  } else if (type === 'object' && typeof value === 'object' && value !== null) {
    const analyzed = analyzeObject(value as Record<string, unknown>, fieldName);
    schema.objectSchema = analyzed.objectSchema;
  }

  return schema;
}

export function generateSchema(data: unknown): DataSchema {
  const schema: DataSchema = {
    rootType: Array.isArray(data) ? 'array' : 'object',
    fields: {},
    metadata: {},
    dataFields: {},
  };

  if (Array.isArray(data)) {
    // For arrays, analyze the first item
    if (data.length > 0 && typeof data[0] === 'object') {
      const firstItem = data[0] as Record<string, unknown>;
      for (const [fieldKey, value] of Object.entries(firstItem)) {
        const fieldSchema = analyzeField(fieldKey, value);
        schema.fields[fieldKey] = fieldSchema;
        
        if (isMetadataField(fieldKey)) {
          schema.metadata![fieldKey] = fieldSchema;
        } else {
          schema.dataFields![fieldKey] = fieldSchema;
        }
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    
    for (const [key, value] of Object.entries(obj)) {
      const fieldSchema = analyzeField(key, value);
      schema.fields[key] = fieldSchema;
      
      if (isMetadataField(key)) {
        schema.metadata![key] = fieldSchema;
      } else {
        schema.dataFields![key] = fieldSchema;
      }
    }
  }

  return schema;
}

export function printSchema(schema: DataSchema, indent = 0): string {
  const spaces = ' '.repeat(indent);
  let output = '';

  output += `${spaces}Root Type: ${schema.rootType}\n`;
  output += `${spaces}\n`;

  // Print Data Fields (non-metadata)
  if (Object.keys(schema.dataFields || {}).length > 0) {
    output += `${spaces}=== DATA FIELDS ===\n`;
    for (const field of Object.values(schema.dataFields!)) {
      output += printField(field, indent + 2);
    }
    output += `${spaces}\n`;
  }

  // Print Metadata Fields (separated)
  if (Object.keys(schema.metadata || {}).length > 0) {
    output += `${spaces}=== METADATA FIELDS (Excluded) ===\n`;
    for (const field of Object.values(schema.metadata!)) {
      output += printField(field, indent + 2);
    }
  }

  return output;
}

function printField(field: FieldSchema, indent = 0): string {
  const spaces = ' '.repeat(indent);
  let output = `${spaces}${field.name}: ${field.type}`;
  
  if (field.isNullable) {
    output += ' (nullable)';
  }

  if (field.arrayItemType) {
    output += ` [${field.arrayItemType}]`;
  }

  output += '\n';

  // Show description if available (like pattern notes)
  if (field.description) {
    output += `${spaces}  // ${field.description}\n`;
  }

  // Print nested object schema
  if (field.objectSchema) {
    output += `${spaces}  {\\n`;
    for (const nestedField of Object.values(field.objectSchema)) {
      output += printField(nestedField, indent + 4);
    }
    output += `${spaces}  }\\n`;
  }

  return output;
}
