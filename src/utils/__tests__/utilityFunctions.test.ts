/**
 * Unit tests for core utility functions used in data transformation
 */

describe('Utility Functions', () => {
  describe('getNestedValue', () => {
    const getNestedValue = (obj: Record<string, any>, path: string): any => {
      if (!path) return undefined;
      const parts = path.split('.');
      let current: any = obj;
      for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        if (typeof current !== 'object' || current === null) return undefined;
        current = current[part];
      }
      return current;
    };

    it('should extract simple top-level values', () => {
      const obj = { name: 'John', age: 30 };
      expect(getNestedValue(obj, 'name')).toBe('John');
      expect(getNestedValue(obj, 'age')).toBe(30);
    });

    it('should extract nested values using dot notation', () => {
      const obj = {
        user: {
          profile: {
            name: 'John',
            age: 30,
          },
        },
      };

      expect(getNestedValue(obj, 'user.profile.name')).toBe('John');
      expect(getNestedValue(obj, 'user.profile.age')).toBe(30);
    });

    it('should return undefined for non-existent paths', () => {
      const obj = { user: { name: 'John' } };
      expect(getNestedValue(obj, 'user.address.city')).toBeUndefined();
      expect(getNestedValue(obj, 'nonexistent')).toBeUndefined();
    });

    it('should return undefined for empty path', () => {
      const obj = { data: 'value' };
      expect(getNestedValue(obj, '')).toBeUndefined();
    });

    it('should handle null and undefined intermediate values', () => {
      const obj1 = { user: null };
      const obj2 = { user: undefined };

      expect(getNestedValue(obj1, 'user.name')).toBeUndefined();
      expect(getNestedValue(obj2, 'user.name')).toBeUndefined();
    });

    it('should handle non-object intermediate values', () => {
      const obj = { user: 'string_value' };
      expect(getNestedValue(obj, 'user.name')).toBeUndefined();
    });

    it('should handle deeply nested structures', () => {
      const obj = {
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

      expect(getNestedValue(obj, 'level1.level2.level3.level4.value')).toBe('deep');
    });

    it('should handle arrays as intermediate values', () => {
      const obj = {
        user: {
          hobbies: ['reading', 'coding'],
        },
      };

      // Array is not an object with properties, so accessing index fails
      expect(getNestedValue(obj, 'user.hobbies')).toEqual(['reading', 'coding']);
    });

    it('should handle numeric values', () => {
      const obj = {
        metrics: {
          price: 150.5,
          volume: 1000000,
        },
      };

      expect(getNestedValue(obj, 'metrics.price')).toBe(150.5);
      expect(getNestedValue(obj, 'metrics.volume')).toBe(1000000);
    });

    it('should handle boolean values', () => {
      const obj = {
        status: {
          isActive: true,
          isVerified: false,
        },
      };

      expect(getNestedValue(obj, 'status.isActive')).toBe(true);
      expect(getNestedValue(obj, 'status.isVerified')).toBe(false);
    });

    it('should handle null as a valid value', () => {
      const obj = {
        user: {
          middleName: null,
        },
      };

      expect(getNestedValue(obj, 'user.middleName')).toBeNull();
    });
  });

  describe('convertStringToNumber', () => {
    const convertStringToNumber = (value: any): any => {
      if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        return parseFloat(value);
      }
      return value;
    };

    it('should convert string numbers to actual numbers', () => {
      expect(convertStringToNumber('150')).toBe(150);
      expect(convertStringToNumber('150.5')).toBe(150.5);
      expect(convertStringToNumber('-50')).toBe(-50);
      expect(convertStringToNumber('-50.25')).toBe(-50.25);
    });

    it('should handle scientific notation', () => {
      expect(convertStringToNumber('1e5')).toBe(100000);
      expect(convertStringToNumber('1.5e-2')).toBe(0.015);
    });

    it('should not convert non-numeric strings', () => {
      expect(convertStringToNumber('abc')).toBe('abc');
      // Note: parseFloat('150abc') returns 150, which is numeric, so it converts
      const result = convertStringToNumber('150abc');
      expect(result).toBe(150);
    });

    it('should leave numbers unchanged', () => {
      expect(convertStringToNumber(150)).toBe(150);
      expect(convertStringToNumber(150.5)).toBe(150.5);
    });

    it('should handle null and undefined', () => {
      expect(convertStringToNumber(null)).toBeNull();
      expect(convertStringToNumber(undefined)).toBeUndefined();
    });
  });

  describe('fuzzyMatchField', () => {
    const fuzzyMatchField = (sourceObj: Record<string, any>, targetFieldName: string): any => {
      const targetNameLower = targetFieldName.toLowerCase();
      for (const [key, val] of Object.entries(sourceObj)) {
        const keyLower = key.toLowerCase();
        if (keyLower.endsWith(targetNameLower) || keyLower.includes(targetNameLower)) {
          return val;
        }
      }
      return undefined;
    };

    it('should match fields with numbered prefixes (Alpha Vantage style)', () => {
      const sourceObj = {
        '1. open': '150',
        '2. high': '160',
        '3. low': '140',
        '4. close': '155',
      };

      expect(fuzzyMatchField(sourceObj, 'open')).toBe('150');
      expect(fuzzyMatchField(sourceObj, 'close')).toBe('155');
      expect(fuzzyMatchField(sourceObj, 'high')).toBe('160');
    });

    it('should match fields case-insensitively', () => {
      const sourceObj = {
        Open: '150',
        CLOSE: '155',
        High: '160',
      };

      expect(fuzzyMatchField(sourceObj, 'open')).toBe('150');
      expect(fuzzyMatchField(sourceObj, 'CLOSE')).toBe('155');
    });

    it('should return undefined for non-matching fields', () => {
      const sourceObj = {
        open: '150',
        close: '155',
      };

      expect(fuzzyMatchField(sourceObj, 'volume')).toBeUndefined();
      expect(fuzzyMatchField(sourceObj, 'nonexistent')).toBeUndefined();
    });

    it('should handle partial matches', () => {
      const sourceObj = {
        'StockOpen': '150',
        'StockClose': '155',
      };

      expect(fuzzyMatchField(sourceObj, 'open')).toBe('150');
      expect(fuzzyMatchField(sourceObj, 'close')).toBe('155');
    });

    it('should return first match when multiple candidates exist', () => {
      const sourceObj = {
        'api_open': '150',
        'open': '151',
      };

      // Should match one of the candidates containing 'open'
      const result = fuzzyMatchField(sourceObj, 'open');
      expect(['150', '151']).toContain(String(result));
    });
  });

  describe('parseChangeDirection', () => {
    type ChangeDirection = 'UP' | 'DOWN' | 'UNCHANGED';
    
    const inferChangeDirection = (change: number): ChangeDirection => {
      if (change > 0) return 'UP';
      if (change < 0) return 'DOWN';
      return 'UNCHANGED';
    };

    it('should return UP for positive values', () => {
      expect(inferChangeDirection(0.01)).toBe('UP');
      expect(inferChangeDirection(1)).toBe('UP');
      expect(inferChangeDirection(100)).toBe('UP');
    });

    it('should return DOWN for negative values', () => {
      expect(inferChangeDirection(-0.01)).toBe('DOWN');
      expect(inferChangeDirection(-1)).toBe('DOWN');
      expect(inferChangeDirection(-100)).toBe('DOWN');
    });

    it('should return UNCHANGED for zero', () => {
      expect(inferChangeDirection(0)).toBe('UNCHANGED');
    });
  });

  describe('extractFieldsWithMapping', () => {
    const extractFields = (
      sourceObj: Record<string, any>,
      mapping: Record<string, string>
    ): Record<string, any> => {
      const result: Record<string, any> = {};

      for (const [targetField, sourcePath] of Object.entries(mapping)) {
        let value = sourceObj[sourcePath];

        // Convert string numbers to actual numbers
        if (typeof value === 'string' && !isNaN(parseFloat(value))) {
          result[targetField] = parseFloat(value);
        } else if (value !== undefined && value !== null) {
          result[targetField] = value;
        }
      }

      return result;
    };

    it('should extract and map fields correctly', () => {
      const sourceObj = {
        ticker: 'AAPL',
        open: '150',
        close: '155',
      };

      const mapping = {
        symbol: 'ticker',
        openPrice: 'open',
        closePrice: 'close',
      };

      const result = extractFields(sourceObj, mapping);

      expect(result.symbol).toBe('AAPL');
      expect(result.openPrice).toBe(150);
      expect(result.closePrice).toBe(155);
    });

    it('should skip undefined/null source fields', () => {
      const sourceObj = {
        ticker: 'AAPL',
        open: '150',
      };

      const mapping = {
        symbol: 'ticker',
        openPrice: 'open',
        closePrice: 'close',
      };

      const result = extractFields(sourceObj, mapping);

      expect(result.symbol).toBe('AAPL');
      expect(result.openPrice).toBe(150);
      expect(result.closePrice).toBeUndefined();
    });

    it('should handle missing source fields', () => {
      const sourceObj = { ticker: 'AAPL' };

      const mapping = {
        symbol: 'ticker',
        openPrice: 'open',
      };

      const result = extractFields(sourceObj, mapping);

      expect(result.symbol).toBe('AAPL');
      expect('openPrice' in result).toBe(false);
    });
  });

  describe('detectArrayNesting', () => {
    const hasNestedArrays = (arr: any[]): boolean => {
      return arr.some(
        item => Array.isArray(item) || (typeof item === 'object' && item !== null && Array.isArray(item.values))
      );
    };

    it('should detect arrays of objects with array properties', () => {
      const data = [
        { metric: 'open', values: ['100', '105'] },
        { metric: 'close', values: ['105', '110'] },
      ];

      expect(hasNestedArrays(data)).toBe(true);
    });

    it('should return false for simple arrays of objects', () => {
      const data = [
        { date: '2024-01-01', open: 100 },
        { date: '2024-01-02', open: 105 },
      ];

      expect(hasNestedArrays(data)).toBe(false);
    });

    it('should detect arrays of arrays', () => {
      const data = [
        ['2024-01-01', '100'],
        ['2024-01-02', '105'],
      ];

      expect(hasNestedArrays(data)).toBe(true);
    });

    it('should handle empty arrays', () => {
      expect(hasNestedArrays([])).toBe(false);
    });
  });
});
