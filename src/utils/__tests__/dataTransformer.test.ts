import { DataTransformer, SchemaMapper, DataSchema } from '@/src/utils';

jest.mock('@/src/utils', () => ({
  ...jest.requireActual('@/src/utils'),
  SchemaMapper: jest.fn(),
}));

describe('DataTransformer', () => {
  let transformer: DataTransformer;
  let mockSchemaMapper: jest.Mocked<SchemaMapper>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockSourceSchema: DataSchema = {
      fields: [
        { name: 'date', type: 'string', examples: ['2024-01-01'] },
        { name: 'open', type: 'number', examples: [100] },
        { name: 'close', type: 'number', examples: [105] },
      ],
      dataStructure: 'time_series',
    };

    transformer = new DataTransformer(mockSourceSchema, 'TEST_API');
    mockSchemaMapper = SchemaMapper as jest.Mocked<typeof SchemaMapper>;
  });

  describe('transform', () => {
    it('should return success response for time series data', () => {
      const mockStructure = {
        type: 'time_series',
        dataPath: ['data'],
        isArray: true,
      };
      const mockMapping = {
        entityMapping: { symbol: 'ticker' },
        priceMapping: { open: 'open', close: 'close' },
      };

      mockSchemaMapper.prototype.detectDataStructure.mockReturnValue(mockStructure as any);
      mockSchemaMapper.prototype.generateMappingTemplate.mockReturnValue(mockMapping as any);

      const rawData = {
        data: [
          { date: '2024-01-01', open: 100, close: 105 },
          { date: '2024-01-02', open: 105, close: 110 },
        ],
      };

      const result = transformer.transform(rawData);

      expect(result.success).toBe(true);
      expect(result.data.dataType).toBe('time_series');
      expect(result.metadata.recordsProcessed).toBeGreaterThan(0);
    });

    it('should return error response for unsupported data type', () => {
      const mockStructure = {
        type: 'unsupported_type',
        dataPath: ['data'],
        isArray: true,
      };
      const mockMapping = {};

      mockSchemaMapper.prototype.detectDataStructure.mockReturnValue(mockStructure as any);
      mockSchemaMapper.prototype.generateMappingTemplate.mockReturnValue(mockMapping as any);

      const rawData = { data: [] };
      const result = transformer.transform(rawData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TRANSFORMATION_ERROR');
      expect(result.metadata.recordsFailed).toBe(0);
    });

    it('should return unsupported data type error', () => {
      const mockStructure = {
        type: 'unsupported_type',
        dataPath: ['data'],
        isArray: true,
      };
      const mockMapping = {};

      mockSchemaMapper.prototype.detectDataStructure.mockReturnValue(mockStructure as any);
      mockSchemaMapper.prototype.generateMappingTemplate.mockReturnValue(mockMapping as any);

      const rawData = { data: [] };
      const result = transformer.transform(rawData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TRANSFORMATION_ERROR');
    });
  });

  describe('extractFields', () => {
    it('should extract fields using mapping', () => {
      const sourceObj = {
        ticker: 'AAPL',
        open: 150,
        close: 155,
      };
      const mapping = {
        entityMapping: { symbol: 'ticker' },
        priceMapping: { open: 'open', close: 'close' },
      };

      mockSchemaMapper.prototype.generateMappingTemplate.mockReturnValue(mapping as any);

      // Access private method via any cast for testing
      const result = (transformer as any).extractFields(sourceObj, mapping);

      expect(result.symbol).toBe('AAPL');
      expect(result.open).toBe(150);
      expect(result.close).toBe(155);
    });

    it('should convert string numbers to actual numbers', () => {
      const sourceObj = {
        open: '150.50',
        close: '155.75',
      };
      const mapping = {
        priceMapping: { open: 'open', close: 'close' },
      };

      const result = (transformer as any).extractFields(sourceObj, mapping);

      expect(result.open).toBe(150.5);
      expect(result.close).toBe(155.75);
      expect(typeof result.open).toBe('number');
    });

    it('should handle undefined values gracefully', () => {
      const sourceObj = {
        ticker: 'AAPL',
      };
      const mapping = {
        entityMapping: { symbol: 'ticker' },
        priceMapping: { open: 'open', close: 'close' },
      };

      const result = (transformer as any).extractFields(sourceObj, mapping);

      expect(result.symbol).toBe('AAPL');
      expect(result.open).toBeUndefined();
      expect(result.close).toBeUndefined();
    });

    it('should handle fuzzy matching for Alpha Vantage style fields', () => {
      const sourceObj = {
        'ticker': 'AAPL',
        '1. open': '150',
        '4. close': '155',
      };
      const mapping = {
        entityMapping: { symbol: 'ticker' },
        priceMapping: { open: 'open', close: 'close' },
      };

      const result = (transformer as any).extractFields(sourceObj, mapping);

      expect(result.symbol).toBe('AAPL');
      expect(result.open).toBe(150);
      expect(result.close).toBe(155);
    });
  });

  describe('getNestedValue', () => {
    it('should extract nested values using dot notation', () => {
      const obj = {
        user: {
          profile: {
            name: 'John',
          },
        },
      };

      const result = (transformer as any).getNestedValue(obj, 'user.profile.name');
      expect(result).toBe('John');
    });

    it('should return undefined for invalid paths', () => {
      const obj = {
        user: {
          profile: {
            name: 'John',
          },
        },
      };

      const result = (transformer as any).getNestedValue(obj, 'user.invalid.path');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty path', () => {
      const obj = { data: 'value' };

      const result = (transformer as any).getNestedValue(obj, '');
      expect(result).toBeUndefined();
    });

    it('should handle null intermediate values', () => {
      const obj = {
        user: null,
      };

      const result = (transformer as any).getNestedValue(obj, 'user.profile.name');
      expect(result).toBeUndefined();
    });

    it('should handle non-object intermediate values', () => {
      const obj = {
        user: 'string_value',
      };

      const result = (transformer as any).getNestedValue(obj, 'user.profile.name');
      expect(result).toBeUndefined();
    });
  });

  describe('inferChangeDirection', () => {
    it('should return UP for positive changes', () => {
      const result = (transformer as any).inferChangeDirection(5);
      expect(result).toBe('up');
    });

    it('should return DOWN for negative changes', () => {
      const result = (transformer as any).inferChangeDirection(-5);
      expect(result).toBe('down');
    });

    it('should return UNCHANGED for zero changes', () => {
      const result = (transformer as any).inferChangeDirection(0);
      expect(result).toBe('unchanged');
    });
  });

  describe('transformTimeSeries', () => {
    it('should handle date-keyed map format (Alpha Vantage style)', () => {
      const rawData = {
        'data': {
          '2024-01-01': { open: '100', close: '105' },
          '2024-01-02': { open: '105', close: '110' },
        },
      };

      const structure = {
        type: 'time_series',
        dataPath: ['data', '[DATE]'],
        isArray: false,
      };

      const mapping = {
        priceMapping: { open: 'open', close: 'close' },
      };

      mockSchemaMapper.prototype.generateColumnDefinitions.mockReturnValue([]);

      const result = (transformer as any).transformTimeSeries(rawData, structure, mapping);

      expect(result.rows.length).toBe(2);
      expect(result.rows[0].date).toBe('2024-01-01');
      expect(result.dataType).toBe('time_series');
    });

    it('should handle array of objects format', () => {
      const rawData = {
        data: [
          { date: '2024-01-01', open: 100, close: 105 },
          { date: '2024-01-02', open: 105, close: 110 },
        ],
      };

      const structure = {
        type: 'time_series',
        dataPath: ['data'],
        isArray: true,
      };

      const mapping = {
        priceMapping: { open: 'open', close: 'close' },
      };

      mockSchemaMapper.prototype.generateColumnDefinitions.mockReturnValue([]);

      const result = (transformer as any).transformTimeSeries(rawData, structure, mapping);

      expect(result.rows.length).toBe(2);
      expect(result.dataType).toBe('time_series');
    });

    it('should pivot Indian API format with datasets', () => {
      const rawData = {
        data: [
          {
            metric: 'open',
            values: [
              ['2024-01-01', '100'],
              ['2024-01-02', '105'],
            ],
          },
          {
            metric: 'close',
            values: [
              ['2024-01-01', '105'],
              ['2024-01-02', '110'],
            ],
          },
        ],
      };

      const structure = {
        type: 'time_series',
        dataPath: ['data'],
        isArray: true,
      };

      const mapping = {};

      mockSchemaMapper.prototype.generateColumnDefinitions.mockReturnValue([]);

      const result = (transformer as any).transformTimeSeries(rawData, structure, mapping);

      expect(result.rows.length).toBe(2);
      expect(result.rows[0].date).toBe('2024-01-01');
      expect(result.rows[0].open).toBe(100);
      expect(result.rows[0].close).toBe(105);
    });
  });
});
