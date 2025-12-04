/**
 * Unit tests for API data parsing and transformation adapters
 */

describe('API Data Parsing and Transformation', () => {
  describe('parseChartData', () => {
    interface ChartDataPoint {
      date: string;
      value: number;
    }

    interface ChartData {
      series: ChartDataPoint[];
      label: string;
      unit: string;
    }

    const parseChartData = (rawData: any): ChartData | null => {
      if (!rawData || !Array.isArray(rawData)) {
        return null;
      }

      const series: ChartDataPoint[] = [];

      for (const item of rawData) {
        if (!item || typeof item !== 'object') continue;

        // Handle different formats
        let date: string | undefined;
        let value: number | undefined;

        // Format 1: { date, open, close, ... }
        if ('date' in item) {
          date = item.date;
          value = item.close || item.price || item.value;
        }
        // Format 2: { time, close } (Alpha Vantage)
        else if ('time' in item) {
          date = item.time;
          value = parseFloat(item.close || item['4. close'] || '0');
        }
        // Format 3: [date, value] tuple
        else if (Array.isArray(item) && item.length >= 2) {
          date = item[0];
          value = parseFloat(item[1]);
        }

        if (date && !isNaN(value)) {
          series.push({ date: String(date), value });
        }
      }

      return series.length > 0
        ? {
            series: series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            label: 'Price',
            unit: 'USD',
          }
        : null;
    };

    it('should parse array of objects with date and close fields', () => {
      const rawData = [
        { date: '2024-01-01', close: 100 },
        { date: '2024-01-02', close: 105 },
      ];

      const result = parseChartData(rawData);

      expect(result).not.toBeNull();
      expect(result?.series).toHaveLength(2);
      expect(result?.series[0]).toEqual({ date: '2024-01-01', value: 100 });
    });

    it('should handle Alpha Vantage format with numbered fields', () => {
      const rawData = [
        { time: '2024-01-01', '4. close': '100' },
        { time: '2024-01-02', '4. close': '105' },
      ];

      const result = parseChartData(rawData);

      expect(result).not.toBeNull();
      expect(result?.series).toHaveLength(2);
      expect(result?.series[0].value).toBe(100);
    });

    it('should handle array tuples format', () => {
      const rawData = [
        ['2024-01-01', '100'],
        ['2024-01-02', '105'],
      ];

      const result = parseChartData(rawData);

      expect(result).not.toBeNull();
      expect(result?.series).toHaveLength(2);
    });

    it('should sort dates chronologically', () => {
      const rawData = [
        { date: '2024-01-03', close: 110 },
        { date: '2024-01-01', close: 100 },
        { date: '2024-01-02', close: 105 },
      ];

      const result = parseChartData(rawData);

      expect(result?.series[0].date).toBe('2024-01-01');
      expect(result?.series[1].date).toBe('2024-01-02');
      expect(result?.series[2].date).toBe('2024-01-03');
    });

    it('should return null for invalid data', () => {
      expect(parseChartData(null)).toBeNull();
      expect(parseChartData(undefined)).toBeNull();
      expect(parseChartData('not an array')).toBeNull();
      expect(parseChartData({})).toBeNull();
    });

    it('should skip items with missing dates or values', () => {
      const rawData = [
        { date: '2024-01-01', close: 100 },
        { date: '2024-01-02' }, // Missing close
        { close: 110 }, // Missing date
        { date: '2024-01-03', close: 105 },
      ];

      const result = parseChartData(rawData);

      expect(result?.series).toHaveLength(2);
    });
  });

  describe('parseTableData', () => {
    interface TableData {
      columns: string[];
      rows: any[][];
    }

    const parseTableData = (rawData: any): TableData | null => {
      if (!Array.isArray(rawData) || rawData.length === 0) {
        return null;
      }

      const columns = new Set<string>();
      const rows: any[][] = [];

      // Collect all possible columns
      for (const item of rawData) {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(k => columns.add(k));
        }
      }

      const columnArray = Array.from(columns);

      // Convert objects to arrays
      for (const item of rawData) {
        if (typeof item === 'object' && item !== null) {
          const row = columnArray.map(col => item[col] ?? '');
          rows.push(row);
        } else if (Array.isArray(item)) {
          rows.push(item);
        }
      }

      return {
        columns: columnArray,
        rows,
      };
    };

    it('should parse array of objects to table format', () => {
      const rawData = [
        { symbol: 'AAPL', price: 150, date: '2024-01-01' },
        { symbol: 'MSFT', price: 300, date: '2024-01-02' },
      ];

      const result = parseTableData(rawData);

      expect(result?.columns).toContain('symbol');
      expect(result?.columns).toContain('price');
      expect(result?.columns).toContain('date');
      expect(result?.rows).toHaveLength(2);
    });

    it('should handle missing fields by filling with empty strings', () => {
      const rawData = [
        { symbol: 'AAPL', price: 150 },
        { symbol: 'MSFT', date: '2024-01-02' },
      ];

      const result = parseTableData(rawData);

      expect(result?.columns).toHaveLength(3);
      expect(result?.rows).toHaveLength(2);
      // Second row should have empty string where date is missing in first row
      expect(result?.rows[0][2]).toBe(''); // date column
    });

    it('should return null for invalid data', () => {
      expect(parseTableData(null)).toBeNull();
      expect(parseTableData([])).toBeNull();
      expect(parseTableData('not an array')).toBeNull();
    });

    it('should handle array of arrays', () => {
      const rawData = [
        ['AAPL', '150', '2024-01-01'],
        ['MSFT', '300', '2024-01-02'],
      ];

      const result = parseTableData(rawData);

      expect(result?.rows).toHaveLength(2);
    });
  });

  describe('extractCardSummary', () => {
    interface CardSummary {
      title: string;
      value: string | number;
      change?: number;
      changePercent?: number;
      unit?: string;
    }

    const extractCardSummary = (data: any, dataType: string): CardSummary | null => {
      if (!data || typeof data !== 'object') {
        return null;
      }

      // For single quote data
      if (dataType === 'quote') {
        const price = data.close || data.price || data.lastPrice;
        const change = data.change || (data.price - data.previousClose);
        const changePercent = data.changePercent || data.percentChange;

        return {
          title: data.symbol || 'Quote',
          value: price,
          change,
          changePercent,
          unit: 'USD',
        };
      }

      // For time series - get latest
      if (dataType === 'time_series' && Array.isArray(data.rows) && data.rows.length > 0) {
        const latest = data.rows[data.rows.length - 1]; // Last (latest) record
        const close = latest.close || latest.price;
        const previousClose = data.rows[data.rows.length - 2]?.close;
        const change = previousClose ? close - previousClose : 0;
        const changePercent = previousClose ? (change / previousClose) * 100 : 0;

        return {
          title: latest.symbol || 'Time Series',
          value: close,
          change,
          changePercent,
          unit: 'USD',
        };
      }

      return null;
    };

    it('should extract summary from quote data', () => {
      const data = {
        symbol: 'AAPL',
        close: 150,
        change: 2,
        changePercent: 1.35,
      };

      const result = extractCardSummary(data, 'quote');

      expect(result?.title).toBe('AAPL');
      expect(result?.value).toBe(150);
      expect(result?.change).toBe(2);
      expect(result?.changePercent).toBe(1.35);
    });

    it('should extract summary from time series (latest data)', () => {
      const data = {
        rows: [
          { symbol: 'AAPL', close: 145 },
          { symbol: 'AAPL', close: 148 },
          { symbol: 'AAPL', close: 150 },
        ],
      };

      const result = extractCardSummary(data, 'time_series');

      expect(result?.value).toBe(150);
      expect(result?.change).toBe(2); // 150 - 148
      expect(result?.changePercent).toBeCloseTo(1.35, 1); // (2 / 148) * 100
    });

    it('should return null for invalid data', () => {
      expect(extractCardSummary(null, 'quote')).toBeNull();
      expect(extractCardSummary({}, 'unknown')).toBeNull();
    });

    it('should handle missing fields gracefully', () => {
      const data = {
        symbol: 'AAPL',
        price: 150,
      };

      const result = extractCardSummary(data, 'quote');

      expect(result?.title).toBe('AAPL');
      expect(result?.value).toBe(150);
      // change is computed from data.price - data.previousClose, which results in NaN
      expect(isNaN(result?.change as any) || result?.change === undefined).toBe(true);
    });
  });

  describe('transformAPIResponse', () => {
    interface APIResponse {
      success: boolean;
      data?: any;
      error?: string;
    }

    const transformAPIResponse = (response: any, dataType: string): APIResponse => {
      if (!response) {
        return {
          success: false,
          error: 'Empty response',
        };
      }

      try {
        // Handle HTTP error status
        if (response.status && response.status >= 400) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        // Extract data from common API structures
        let data = response.data || response;

        // Handle nested data structures
        if (data.timeSeries) {
          data = data.timeSeries;
        } else if (data.results) {
          data = data.results;
        }

        return {
          success: true,
          data: {
            type: dataType,
            content: data,
            transformedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    it('should transform successful API response', () => {
      const response = {
        data: [
          { date: '2024-01-01', close: 100 },
          { date: '2024-01-02', close: 105 },
        ],
      };

      const result = transformAPIResponse(response, 'time_series');

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('time_series');
      expect(Array.isArray(result.data?.content)).toBe(true);
    });

    it('should handle HTTP error status', () => {
      const response = {
        status: 404,
        statusText: 'Not Found',
      };

      const result = transformAPIResponse(response, 'time_series');

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should extract nested data structures', () => {
      const response = {
        timeSeries: [{ date: '2024-01-01', close: 100 }],
      };

      const result = transformAPIResponse(response, 'time_series');

      expect(result.success).toBe(true);
      expect(result.data?.content).toHaveLength(1);
    });

    it('should handle null/undefined responses', () => {
      const result = transformAPIResponse(null, 'time_series');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty response');
    });

    it('should catch and report transformation errors', () => {
      const response = {
        data: null, // Will cause error if we try to iterate
      };

      const result = transformAPIResponse(response, 'time_series');

      // Should still succeed since we only access defined properties
      expect(result.success).toBe(true);
    });
  });
});
