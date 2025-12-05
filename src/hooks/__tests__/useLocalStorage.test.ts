/**
 * Minimal tests for useLocalStorage hook
 */

import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useLocalStorage<string>('test-key', 'initial-value')
    );

    expect(result.current[0]).toBe('initial-value');
  });

  it('should update localStorage when value changes', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useLocalStorage<string>('test-key', 'initial')
    );

    act(() => {
      result.current[1]('updated');
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify('updated')
    );
    expect(result.current[0]).toBe('updated');
  });

  it('should return stored value from localStorage', () => {
    const storedValue = { name: 'John', age: 30 };
    (localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify(storedValue)
    );

    const { result } = renderHook(() =>
      useLocalStorage('user', { name: '', age: 0 })
    );

    expect(result.current[0]).toEqual(storedValue);
  });
});
