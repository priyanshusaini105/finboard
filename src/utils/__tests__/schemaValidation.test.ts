/**
 * Unit tests for schema generation, validation, and data type inference
 */

describe('Schema Generation and Validation', () => {
  type FieldType = 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean' | 'array';

  describe('inferFieldType', () => {
    const inferFieldType = (value: any, fieldName: string): FieldType => {
      // Check by field name patterns first
      const nameLower = fieldName.toLowerCase();

      if (nameLower.includes('date') || nameLower.includes('time')) {
        return 'date';
      }

      if (nameLower.includes('price') || nameLower.includes('cost') || nameLower.includes('amount')) {
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
          return 'currency';
        }
      }

      if (nameLower.includes('percent') || nameLower.includes('change') || nameLower.includes('ratio')) {
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
          return 'percentage';
        }
      }

      // Check by value type
      if (typeof value === 'boolean') {
        return 'boolean';
      }

      if (Array.isArray(value)) {
        return 'array';
      }

      if (typeof value === 'number') {
        return 'number';
      }

      if (typeof value === 'string') {
        // Try to parse as number
        if (!isNaN(parseFloat(value)) && isFinite(Number(value))) {
          return 'number';
        }

        // Try to parse as date
        // Check for ISO date formats without using Date.parse (which may be mocked)
        if (/^\d{4}-\d{2}-\d{2}/.test(value) || value.includes('T')) {
          return 'date';
        }

        return 'string';
      }

      return 'string';
    };

    it('should infer currency type from field names', () => {
      expect(inferFieldType(150.5, 'price')).toBe('currency');
      expect(inferFieldType(100, 'openPrice')).toBe('currency');
      expect(inferFieldType('200.50', 'cost')).toBe('currency');
    });

    it('should infer percentage type from field names', () => {
      expect(inferFieldType(5.5, 'changePercent')).toBe('percentage');
      expect(inferFieldType(-2.1, 'percentChange')).toBe('percentage');
      expect(inferFieldType('1.5', 'change')).toBe('percentage');
    });

    it('should infer date type from field names', () => {
      expect(inferFieldType('2024-01-01', 'date')).toBe('date');
      expect(inferFieldType('2024-01-01T12:00:00Z', 'timestamp')).toBe('date');
    });

    it('should infer date type from ISO format strings', () => {
      expect(inferFieldType('2024-01-01', 'day')).toBe('date');
      expect(inferFieldType('2024-01-01T12:00:00Z', 'eventTime')).toBe('date');
    });

    it('should infer number type correctly', () => {
      expect(inferFieldType(100, 'volume')).toBe('number');
      expect(inferFieldType(150.5, 'value')).toBe('number');
      expect(inferFieldType('1000', 'count')).toBe('number');
    });

    it('should infer boolean type correctly', () => {
      expect(inferFieldType(true, 'isActive')).toBe('boolean');
      expect(inferFieldType(false, 'isDeleted')).toBe('boolean');
    });

    it('should infer array type correctly', () => {
      expect(inferFieldType([1, 2, 3], 'values')).toBe('array');
      expect(inferFieldType(['a', 'b'], 'items')).toBe('array');
    });

    it('should default to string for unknown types', () => {
      expect(inferFieldType('hello', 'text')).toBe('string');
      expect(inferFieldType({}, 'object')).toBe('string');
    });
  });

  describe('detectDataStructure', () => {
    type DataStructureType = 'time_series' | 'quote' | 'trending' | 'unknown';

    interface DataStructure {
      type: DataStructureType;
      dataPath: string[];
      isArray: boolean;
    }

    const detectDataStructure = (data: Record<string, any>): DataStructure => {
      // Check for time series indicators
      const hasDateFields = Object.keys(data).some(
        k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k === '[DATE]'
      );

      let hasOHLCV = false;
      if (Array.isArray(data.data) && data.data.length > 0) {
        const firstItem = data.data[0];
        if (typeof firstItem === 'object') {
          hasOHLCV = Object.keys(firstItem).some(k =>
            ['open', 'high', 'low', 'close', 'volume', 'date', 'time'].some(field => k.toLowerCase().includes(field))
          );
        }
      }

      if (hasOHLCV) {
        return {
          type: 'time_series',
          dataPath: ['data'],
          isArray: Array.isArray(data.data),
        };
      }

      // Check for quote (single point in time)
      if (Object.keys(data).some(k =>
        ['open', 'high', 'low', 'close', 'volume'].some(field => k.toLowerCase().includes(field))
      )) {
        return {
          type: 'quote',
          dataPath: [],
          isArray: false,
        };
      }

      // Check for trending (list of entities with ranking)
      if (Array.isArray(data.data) && data.data.length > 0) {
        const firstItem = data.data[0];
        if (typeof firstItem === 'object' && ('rank' in firstItem || 'change' in firstItem)) {
          return {
            type: 'trending',
            dataPath: ['data'],
            isArray: true,
          };
        }
      }

      return {
        type: 'unknown',
        dataPath: [],
        isArray: false,
      };
    };

    it('should detect time series structure', () => {
      const data = {
        data: [
          { date: '2024-01-01', open: 100, close: 105 },
          { date: '2024-01-02', open: 105, close: 110 },
        ],
      };

      const result = detectDataStructure(data);
      expect(result.type).toBe('time_series');
      expect(result.isArray).toBe(true);
    });

    it('should detect quote structure', () => {
      const data = {
        symbol: 'AAPL',
        open: 150,
        high: 155,
        low: 145,
        close: 152,
        volume: 1000000,
      };

      const result = detectDataStructure(data);
      expect(result.type).toBe('quote');
      expect(result.isArray).toBe(false);
    });

    it('should detect trending structure', () => {
      const data = {
        data: [
          { symbol: 'AAPL', rank: 1, change: 5.5 },
          { symbol: 'MSFT', rank: 2, change: 3.2 },
        ],
      };

      const result = detectDataStructure(data);
      expect(result.type).toBe('trending');
      expect(result.isArray).toBe(true);
    });

    it('should return unknown for unrecognized structures', () => {
      const data = { unknown: 'structure' };

      const result = detectDataStructure(data);
      expect(result.type).toBe('unknown');
    });
  });

  describe('validateSchemaMapping', () => {
    interface SchemaMapping {
      [targetField: string]: string; // targetField -> sourcePath
    }

    const validateMapping = (mapping: SchemaMapping, sourceData: Record<string, any>): string[] => {
      const errors: string[] = [];

      for (const [targetField, sourcePath] of Object.entries(mapping)) {
        if (!sourcePath || typeof sourcePath !== 'string') {
          errors.push(`Invalid mapping for ${targetField}: source path must be a non-empty string`);
          continue;
        }

        // Check if source path exists in data
        const parts = sourcePath.split('.');
        let current: any = sourceData;
        let found = false;

        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
            found = true;
          } else {
            found = false;
            break;
          }
        }

        if (!found) {
          errors.push(`Field ${targetField} maps to non-existent path: ${sourcePath}`);
        }
      }

      return errors;
    };

    it('should validate correct mappings', () => {
      const mapping = {
        symbol: 'ticker',
        price: 'quotes.price',
      };

      const sourceData = {
        ticker: 'AAPL',
        quotes: {
          price: 150,
        },
      };

      const errors = validateMapping(mapping, sourceData);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing source paths', () => {
      const mapping = {
        symbol: 'ticker',
        price: 'quotes.price',
      };

      const sourceData = {
        ticker: 'AAPL',
      };

      const errors = validateMapping(mapping, sourceData);
      expect(errors).toContain('Field price maps to non-existent path: quotes.price');
    });

    it('should detect invalid mapping values', () => {
      const mapping = {
        symbol: '',
        price: 'quotes.price',
      } as any;

      const sourceData = {
        ticker: 'AAPL',
        quotes: { price: 150 },
      };

      const errors = validateMapping(mapping, sourceData);
      expect(errors).toContain('Invalid mapping for symbol: source path must be a non-empty string');
    });

    it('should handle nested paths', () => {
      const mapping = {
        symbol: 'metadata.info.ticker',
      };

      const sourceData = {
        metadata: {
          info: {
            ticker: 'AAPL',
          },
        },
      };

      const errors = validateMapping(mapping, sourceData);
      expect(errors).toHaveLength(0);
    });
  });

  describe('inferSchemaFromData', () => {
    interface FieldSchema {
      name: string;
      type: FieldType;
      examples: any[];
      nullable: boolean;
    }

    // Helper to infer type (reuse from other test or inline)
    const inferFieldTypeHelper = (value: any, fieldName: string): FieldType => {
      const nameLower = fieldName.toLowerCase();

      if (nameLower.includes('date') || nameLower.includes('time')) {
        return 'date';
      }

      if (nameLower.includes('price') || nameLower.includes('cost') || nameLower.includes('amount')) {
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
          return 'currency';
        }
      }

      if (nameLower.includes('percent') || nameLower.includes('change') || nameLower.includes('ratio')) {
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
          return 'percentage';
        }
      }

      if (typeof value === 'boolean') {
        return 'boolean';
      }

      if (Array.isArray(value)) {
        return 'array';
      }

      if (typeof value === 'number') {
        return 'number';
      }

      if (typeof value === 'string') {
        if (!isNaN(parseFloat(value)) && isFinite(Number(value))) {
          return 'number';
        }
        return 'string';
      }

      return 'string';
    };

    const inferSchema = (dataArray: any[]): FieldSchema[] => {
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return [];
      }

      const fieldInfo: Record<string, FieldSchema> = {};

      for (const record of dataArray) {
        if (typeof record !== 'object' || record === null) continue;

        for (const [key, value] of Object.entries(record)) {
          if (!fieldInfo[key]) {
            fieldInfo[key] = {
              name: key,
              type: inferFieldTypeHelper(value, key),
              examples: [],
              nullable: value === null || value === undefined,
            };
          }

          // Track examples
          if (value !== null && value !== undefined && fieldInfo[key].examples.length < 2) {
            fieldInfo[key].examples.push(value);
          }

          // Update nullable
          if (value === null || value === undefined) {
            fieldInfo[key].nullable = true;
          }
        }
      }

      return Object.values(fieldInfo);
    };

    it('should infer schema from array of objects', () => {
      const data = [
        { symbol: 'AAPL', price: 150.5, date: '2024-01-01' },
        { symbol: 'MSFT', price: 300.2, date: '2024-01-02' },
      ];

      const schema = inferSchema(data);

      expect(schema).toHaveLength(3);
      expect(schema.find(f => f.name === 'symbol')?.type).toBe('string');
      expect(schema.find(f => f.name === 'price')?.type).toBe('currency');
      expect(schema.find(f => f.name === 'date')?.type).toBe('date');
    });

    it('should track nullable fields', () => {
      const data = [
        { symbol: 'AAPL', price: 150.5 },
        { symbol: 'MSFT', price: null },
      ];

      const schema = inferSchema(data);
      expect(schema.find(f => f.name === 'price')?.nullable).toBe(true);
    });

    it('should handle empty arrays', () => {
      const schema = inferSchema([]);
      expect(schema).toHaveLength(0);
    });

    it('should collect examples', () => {
      const data = [
        { symbol: 'AAPL', value: 100 },
        { symbol: 'MSFT', value: 200 },
        { symbol: 'GOOG', value: 300 },
      ];

      const schema = inferSchema(data);
      const symbolField = schema.find(f => f.name === 'symbol');
      expect(symbolField?.examples.length).toBeGreaterThan(0);
    });
  });
});
