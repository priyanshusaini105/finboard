/**
 * Mock fetch API for testing
 */

export interface MockFetchOptions {
  status?: number;
  statusText?: string;
  data?: unknown;
  error?: Error;
  delay?: number;
}

export const mockFetch = (response: MockFetchOptions = {}) => {
  const {
    status = 200,
    statusText = 'OK',
    data = {},
    error,
    delay = 0,
  } = response;

  return jest.fn(async () => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (error) {
      throw error;
    }

    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      json: jest.fn(async () => data),
      text: jest.fn(async () => JSON.stringify(data)),
      blob: jest.fn(async () => new Blob([JSON.stringify(data)])),
      arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
      clone: jest.fn(function() { return this; }),
      headers: new Headers(),
      redirected: false,
      type: 'basic' as const,
      url: '',
    };
  });
};

export const createFetchMock = (responses: Record<string, MockFetchOptions>) => {
  return jest.fn((url: string) => {
    const response = responses[url] || responses['*'];
    if (!response) {
      throw new Error(`No mock response configured for ${url}`);
    }
    return mockFetch(response)();
  });
};
