/**
 * Testing utilities and helpers
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

export const resetAllMocks = () => {
  jest.clearAllMocks();
  localStorage.clear();
  (localStorage.getItem as jest.Mock).mockClear();
  (localStorage.setItem as jest.Mock).mockClear();
  (localStorage.removeItem as jest.Mock).mockClear();
};

export const waitFor = async (callback: () => void, timeout = 1000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      callback();
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  throw new Error('Timeout waiting for condition');
};

export const renderWithProviders = (
  ui: ReactElement,
  options?: RenderOptions
) => {
  return render(ui, { ...options });
};

export const createDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockQueryClient = () => {
  return {
    prefetchQuery: jest.fn(),
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
    clear: jest.fn(),
  };
};
