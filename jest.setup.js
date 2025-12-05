/* eslint-disable @typescript-eslint/no-require-imports */
require('@testing-library/jest-dom');

// Polyfill TextEncoder/TextDecoder for Node environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Store original Date for use in tests
const OriginalDate = global.Date;

// Only mock Date.now if needed, preserve Date object itself
// This allows Date.parse to work while still having a consistent test time
const mockNow = new Date('2024-01-01T12:00:00Z').getTime();
OriginalDate.now = jest.fn(() => mockNow);

// Mock localStorage with actual storage functionality
const createStorageMock = () => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
};

const localStorageMock = createStorageMock();
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
} else {
  global.localStorage = localStorageMock;
}

// Mock sessionStorage
const sessionStorageMock = createStorageMock();
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });
} else {
  global.sessionStorage = sessionStorageMock;
}

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Suppress console errors and warnings in tests unless explicitly needed
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
