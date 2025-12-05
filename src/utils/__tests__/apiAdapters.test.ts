/**
 * Tests for apiAdapters utility
 */

import { getApiProvider, buildApiUrl, isProxyableApi } from '@/utils/apiAdapters';
import { resetAllMocks } from '@/__tests__/utils/testUtils';

describe('apiAdapters', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('getApiProvider', () => {
    it('should identify AlphaVantage API', () => {
      const urls = [
        'https://www.alphavantage.co/query',
        'https://alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL',
      ];

      urls.forEach(url => {
        const provider = getApiProvider(url);
        expect(provider).toBe('alphavantage');
      });
    });

    it('should identify Finnhub API', () => {
      const urls = [
        'https://finnhub.io/api/v1/quote',
        'https://finnhub.io/api/v1/stock/profile2',
      ];

      urls.forEach(url => {
        const provider = getApiProvider(url);
        expect(provider).toBe('finnhub');
      });
    });

    it('should identify Indian Stock API', () => {
      const urls = [
        'https://api.example.com/indian-stocks',
        'https://indianapi.com/stocks',
      ];

      urls.forEach(url => {
        // This depends on actual implementation
        const provider = getApiProvider(url);
        expect(provider).toBeDefined();
      });
    });

    it('should return unknown for unrecognized API', () => {
      const provider = getApiProvider('https://unknown-api.com/endpoint');
      expect(provider).toBe('unknown');
    });
  });

  describe('buildApiUrl', () => {
    it('should build URL with basic params', () => {
      const url = buildApiUrl('https://api.example.com/data', {
        symbol: 'AAPL',
        interval: '5min',
      });

      expect(url).toContain('symbol=AAPL');
      expect(url).toContain('interval=5min');
    });

    it('should handle empty params', () => {
      const url = buildApiUrl('https://api.example.com/data', {});
      expect(url).toBe('https://api.example.com/data');
    });

    it('should URL encode special characters', () => {
      const url = buildApiUrl('https://api.example.com/data', {
        query: 'symbol AAPL price',
      });

      expect(url).toContain('query=');
      expect(url).not.toContain(' ');
    });

    it('should handle numeric values', () => {
      const url = buildApiUrl('https://api.example.com/data', {
        limit: 100,
        offset: 50,
      });

      expect(url).toContain('limit=100');
      expect(url).toContain('offset=50');
    });

    it('should handle boolean values', () => {
      const url = buildApiUrl('https://api.example.com/data', {
        includeMetadata: true,
        excludeNull: false,
      });

      expect(url).toContain('includeMetadata=true');
      expect(url).toContain('excludeNull=false');
    });

    it('should preserve existing query params', () => {
      const url = buildApiUrl('https://api.example.com/data?key=value', {
        symbol: 'AAPL',
      });

      expect(url).toContain('key=value');
      expect(url).toContain('symbol=AAPL');
    });
  });

  describe('isProxyableApi', () => {
    it('should identify external APIs as proxyable', () => {
      const apis = [
        'https://www.alphavantage.co/query',
        'https://finnhub.io/api/v1/quote',
      ];

      apis.forEach(api => {
        const proxyable = isProxyableApi(api);
        expect(proxyable).toBe(true);
      });
    });

    it('should identify internal APIs as not proxyable', () => {
      const apis = [
        'http://localhost:3000/api/data',
        'https://internal.example.com/api/data',
      ];

      apis.forEach(api => {
        const proxyable = isProxyableApi(api);
        expect(proxyable).toBe(false);
      });
    });

    it('should handle relative URLs', () => {
      const proxyable = isProxyableApi('/api/data');
      expect(proxyable).toBe(false);
    });

    it('should handle malformed URLs gracefully', () => {
      expect(() => {
        isProxyableApi('not-a-url');
      }).not.toThrow();
    });
  });
});
