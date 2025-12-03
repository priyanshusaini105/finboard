import { useEffect, useState } from "react";

/**
 * Hook to persist and retrieve data from localStorage
 * @param key - The localStorage key
 * @param initialValue - The initial value if localStorage is empty
 * @returns [storedValue, setValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
      setIsLoaded(true);
    } catch (error) {
      console.warn(`Error reading from localStorage key "${key}":`, error);
      setIsLoaded(true);
    }
  }, [key]);

  // Update localStorage when value changes
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
