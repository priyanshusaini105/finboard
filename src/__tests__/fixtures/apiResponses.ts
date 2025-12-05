/**
 * Test data and fixtures
 */

export const API_RESPONSES = {
  timeSeries: {
    'Meta Data': {
      '1. Information': 'Time Series (5min)',
      '2. Symbol': 'AAPL',
      '3. Last Refreshed': '2024-01-01 16:00:00',
    },
    'Time Series (5min)': {
      '2024-01-01 16:00:00': {
        '1. open': '150.00',
        '2. high': '151.50',
        '3. low': '149.50',
        '4. close': '150.75',
        '5. volume': '1000000',
      },
      '2024-01-01 15:55:00': {
        '1. open': '149.50',
        '2. high': '150.50',
        '3. low': '149.00',
        '4. close': '150.00',
        '5. volume': '950000',
      },
    },
  },
  quote: {
    'Global Quote': {
      '01. symbol': 'AAPL',
      '02. open': '150.00',
      '03. high': '151.50',
      '04. low': '149.50',
      '05. price': '150.75',
      '06. volume': '1000000',
      '07. latest trading day': '2024-01-01',
      '08. previous close': '150.00',
      '09. change': '0.75',
      '10. change percent': '0.50%',
    },
  },
  finnhubTrade: {
    type: 'trade',
    data: [
      {
        p: 150.75,
        s: 'AAPL',
        t: 1704110400000,
        v: 100,
      },
      {
        p: 150.50,
        s: 'AAPL',
        t: 1704110401000,
        v: 150,
      },
    ],
  },
  indianStock: [
    {
      SYMBOL: 'RELIANCE',
      PRICE: 2500.5,
      CHANGE: 25.5,
      'CHANGE %': 1.03,
    },
    {
      SYMBOL: 'TCS',
      PRICE: 3500.25,
      CHANGE: -50.25,
      'CHANGE %': -1.41,
    },
  ],
  error: {
    'Error Message': 'Invalid API call.',
    Information: 'The premium API call frequency is 5 requests per minute and 500 requests per day.',
  },
};

export const MOCK_HEADERS = {
  'X-API-Key': 'test-api-key',
  'Authorization': 'Bearer test-token',
};

export const MOCK_URL_PARAMS = {
  symbol: 'AAPL',
  interval: '5min',
  outputsize: 'full',
};

export const MOCK_TRANSFORMED_DATA = {
  metadata: {
    symbol: 'AAPL',
    interval: '5min',
    lastRefreshed: '2024-01-01T16:00:00Z',
    transformedAt: '2024-01-01T16:00:00Z',
    recordsProcessed: 2,
    recordsSuccessful: 2,
    transformationTimeMs: 10,
  },
  tableData: [
    { date: '2024-01-01', open: 150.0, high: 151.5, low: 149.5, close: 150.75, volume: 1000000 },
    { date: '2024-01-01', open: 149.5, high: 150.5, low: 149.0, close: 150.0, volume: 950000 },
  ],
  chartData: [
    { x: '2024-01-01T16:00:00Z', y: 150.75 },
    { x: '2024-01-01T15:55:00Z', y: 150.0 },
  ],
  cardData: {
    symbol: 'AAPL',
    price: '150.75',
    change: '+0.75 (+0.50%)',
  },
};

export const ERROR_RESPONSES = {
  rateLimitError: {
    status: 429,
    statusText: 'Too Many Requests',
    data: { message: 'Rate limit exceeded' },
  },
  notFoundError: {
    status: 404,
    statusText: 'Not Found',
    data: { message: 'Resource not found' },
  },
  unauthorizedError: {
    status: 401,
    statusText: 'Unauthorized',
    data: { message: 'Invalid API key' },
  },
  serverError: {
    status: 500,
    statusText: 'Internal Server Error',
    data: { message: 'Server error' },
  },
};
