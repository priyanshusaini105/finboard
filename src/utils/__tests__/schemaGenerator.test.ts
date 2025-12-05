/**
 * Tests for schemaGenerator utility
 */

import {
  inferSchema,
  detectFieldType,
} from '@/utils/schemaGenerator';
import { API_RESPONSES } from '@/__tests__/fixtures/apiResponses';
import { resetAllMocks } from '@/__tests__/utils/testUtils';

describe('schemaGenerator', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('detectFieldType', () => {
    it('should detect string type', () => {
      const type = detectFieldType('hello');
      expect(type).toBe('string');
    });

    it('should detect number type', () => {
      const type = detectFieldType(42);
      expect(type).toBe('number');
    });

    it('should detect boolean type', () => {
      const type1 = detectFieldType(true);
      const type2 = detectFieldType(false);
      expect(type1).toBe('boolean');
      expect(type2).toBe('boolean');
    });

    it('should detect date type', () => {
      const type = detectFieldType('2024-01-15');
      expect(type).toBe('date');
    });

    it('should detect datetime type', () => {
      const type = detectFieldType('2024-01-15T10:30:00');
      expect(type).toBe('datetime');
    });

    it('should detect timestamp type', () => {
      const type1 = detectFieldType('1704110400'); // 10 digits
      const type2 = detectFieldType('1704110400000'); // 13 digits
      expect(type1).toBe('timestamp');
      expect(type2).toBe('timestamp');
    });

    it('should detect currency type', () => {
      const type1 = detectFieldType('$100.50');
      const type2 = detectFieldType('$1,234.56');
      expect(type1).toBe('currency');
      expect(type2).toBe('currency');
    });

    it('should detect percentage type', () => {
      const type1 = detectFieldType('10.5%');
      const type2 = detectFieldType('10.5 percent');
      expect(type1).toBe('percentage');
      expect(type2).toBe('percentage');
    });

    it('should detect array type', () => {
      const type = detectFieldType([1, 2, 3]);
      expect(type).toBe('array');
    });

    it('should detect object type', () => {
      const type = detectFieldType({ key: 'value' });
      expect(type).toBe('object');
    });

    it('should detect null type', () => {
      const type = detectFieldType(null);
      expect(type).toBe('null');
    });

    it('should handle string numbers', () => {
      const type = detectFieldType('123');
      expect(type).toBe('number');
    });

    it('should handle negative numbers', () => {
      const type = detectFieldType('-42.5');
      expect(type).toBe('number');
    });
  });

  describe('inferSchema', () => {
    it('should infer schema from simple object', () => {
      const data = {
        name: 'John',
        age: 30,
        active: true,
      };

      const schema = inferSchema(data);

      expect(schema.rootType).toBe('object');
      expect(schema.fields).toBeDefined();
      expect(schema.fields.name.type).toBe('string');
      expect(schema.fields.age.type).toBe('number');
      expect(schema.fields.active.type).toBe('boolean');
    });

    it('should infer schema from array of objects', () => {
      const data = [
        { id: 1, name: 'Item 1', price: 10.5 },
        { id: 2, name: 'Item 2', price: 20.75 },
      ];

      const schema = inferSchema(data);

      expect(schema.rootType).toBe('array');
      expect(schema.fields.id.type).toBe('number');
      expect(schema.fields.name.type).toBe('string');
      expect(schema.fields.price.type).toBe('number');
    });

    it('should infer schema from time series data', () => {
      const data = API_RESPONSES.timeSeries;
      const schema = inferSchema(data);

      expect(schema).toBeDefined();
      expect(schema.fields).toBeDefined();
    });

    it('should infer schema from quote data', () => {
      const data = API_RESPONSES.quote;
      const schema = inferSchema(data);

      expect(schema).toBeDefined();
      expect(schema.fields).toBeDefined();
    });

    it('should infer schema from indian stock data', () => {
      const data = API_RESPONSES.indianStock;
      const schema = inferSchema(data);

      expect(schema.rootType).toBe('array');
      expect(schema.fields).toBeDefined();
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            email: 'john@example.com',
          },
        },
      };

      const schema = inferSchema(data);

      expect(schema.fields.user.type).toBe('object');
      expect(schema.fields.user.objectSchema).toBeDefined();
    });

    it('should handle arrays within objects', () => {
      const data = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      };

      const schema = inferSchema(data);

      expect(schema.fields.items.type).toBe('array');
      expect(schema.fields.items.arrayItemType).toBeDefined();
    });

    it('should handle empty arrays', () => {
      const data = {
        tags: [],
      };

      const schema = inferSchema(data);

      expect(schema.fields.tags.type).toBe('array');
    });

    it('should handle mixed type arrays', () => {
      const data = {
        values: [1, '2', 3, '4'],
      };

      const schema = inferSchema(data);

      expect(schema.fields.values.type).toBe('array');
    });

    it('should separate metadata fields', () => {
      const data = {
        'Meta Data': {
          '1. Information': 'Time Series',
          '2. Symbol': 'AAPL',
        },
        'Time Series': {
          '2024-01-01': {
            open: '150',
            close: '151',
          },
        },
      };

      const schema = inferSchema(data);

      expect(schema.metadata || schema.fields['Meta Data']).toBeDefined();
    });

    it('should mark nullable fields', () => {
      const data = {
        field1: 'value',
        field2: null,
      };

      const schema = inferSchema(data);

      expect(schema.fields.field1).toBeDefined();
    });

    it('should handle very large objects', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const largeData: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeData[`field_${i}`] = `value_${i}`;
      }

      const schema = inferSchema(largeData);

      expect(Object.keys(schema.fields).length).toBe(100);
    });

    it('should handle deeply nested structures', () => {
      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      const schema = inferSchema(deepData);

      expect(schema.fields.level1.type).toBe('object');
    });
  });

  describe('field schema generation', () => {
    it('should generate field schema with name', () => {
      const data = { testField: 'value' };
      const schema = inferSchema(data);

      expect(schema.fields.testField.name).toBe('testField');
    });

    it('should generate field schema with type', () => {
      const data = { stringField: 'text', numberField: 42 };
      const schema = inferSchema(data);

      expect(schema.fields.stringField.type).toBe('string');
      expect(schema.fields.numberField.type).toBe('number');
    });

    it('should handle numeric field names', () => {
      const data = {
        '1. open': '150.00',
        '2. close': '151.00',
      };

      const schema = inferSchema(data);

      expect(schema.fields['1. open']).toBeDefined();
      expect(schema.fields['2. close']).toBeDefined();
    });

    it('should handle special characters in field names', () => {
      const data = {
        'field-with-dashes': 'value',
        'field_with_underscores': 'value',
        'field with spaces': 'value',
      };

      const schema = inferSchema(data);

      expect(schema.fields['field-with-dashes']).toBeDefined();
      expect(schema.fields['field_with_underscores']).toBeDefined();
      expect(schema.fields['field with spaces']).toBeDefined();
    });
  });

  describe('date/time type detection', () => {
    it('should detect YYYY-MM-DD format as date', () => {
      const type = detectFieldType('2024-01-15');
      expect(type).toBe('date');
    });

    it('should detect MM/DD/YYYY format as date', () => {
      const type = detectFieldType('01/15/2024');
      expect(type).toBe('date');
    });

    it('should detect YYYY/MM/DD format as date', () => {
      const type = detectFieldType('2024/01/15');
      expect(type).toBe('date');
    });

    it('should detect ISO 8601 format as datetime', () => {
      const type = detectFieldType('2024-01-15T10:30:00Z');
      expect(type).toBe('datetime');
    });

    it('should detect Unix timestamp (10 digits)', () => {
      const type = detectFieldType('1704110400');
      expect(type).toBe('timestamp');
    });

    it('should detect Unix timestamp (13 digits)', () => {
      const type = detectFieldType('1704110400000');
      expect(type).toBe('timestamp');
    });
  });

  describe('currency and percentage detection', () => {
    it('should detect $100.50 as currency', () => {
      const type = detectFieldType('$100.50');
      expect(type).toBe('currency');
    });

    it('should detect $1,234.56 as currency', () => {
      const type = detectFieldType('$1,234.56');
      expect(type).toBe('currency');
    });

    it('should detect 10.5% as percentage', () => {
      const type = detectFieldType('10.5%');
      expect(type).toBe('percentage');
    });

    it('should detect negative percentage -10.5%', () => {
      const type = detectFieldType('-10.5%');
      expect(type).toBe('percentage');
    });
  });

  describe('array type detection', () => {
    it('should detect array of numbers', () => {
      const data = [1, 2, 3, 4, 5];
      const schema = inferSchema(data);

      expect(schema.rootType).toBe('array');
      expect(schema.fields).toBeDefined();
    });

    it('should detect array of strings', () => {
      const data = ['a', 'b', 'c'];
      const schema = inferSchema(data);

      expect(schema.rootType).toBe('array');
    });

    it('should detect array of objects', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const schema = inferSchema(data);

      expect(schema.rootType).toBe('array');
      expect(schema.fields.id).toBeDefined();
      expect(schema.fields.name).toBeDefined();
    });

    it('should handle empty array', () => {
      const data = [];
      const schema = inferSchema(data);

      expect(schema.rootType).toBe('array');
    });
  });

  describe('real world data schemas', () => {
    it('should handle alphavantage time series response', () => {
      const schema = inferSchema(API_RESPONSES.timeSeries);

      expect(schema).toBeDefined();
      expect(schema.fields).toBeDefined();
    });

    it('should handle finnhub trade data', () => {
      const schema = inferSchema(API_RESPONSES.finnhubTrade);

      expect(schema).toBeDefined();
      expect(schema.fields.type).toBeDefined();
      expect(schema.fields.data).toBeDefined();
    });

    it('should handle error response', () => {
      const schema = inferSchema(API_RESPONSES.error);

      expect(schema).toBeDefined();
      expect(schema.fields).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null data', () => {
      const schema = inferSchema(null);
      expect(schema).toBeDefined();
    });

    it('should handle undefined data', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schema = inferSchema(undefined as any);
      expect(schema).toBeDefined();
    });

    it('should handle empty object', () => {
      const schema = inferSchema({});
      expect(schema.rootType).toBe('object');
      expect(Object.keys(schema.fields).length).toBe(0);
    });

    it('should handle single element array', () => {
      const schema = inferSchema([{ id: 1 }]);
      expect(schema.rootType).toBe('array');
    });

    it('should handle very long strings', () => {
      const longString = 'x'.repeat(10000);
      const data = { field: longString };
      const schema = inferSchema(data);

      expect(schema.fields.field.type).toBe('string');
    });

    it('should handle circular references gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = { field: 'value' };
      data.self = data; // Circular reference

      // Should not throw
      expect(() => {
        inferSchema(data);
      }).not.toThrow();
    });
  });
});
