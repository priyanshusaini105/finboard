/**
 * Tests for useHeaderManagement hook
 */

import { renderHook, act } from '@testing-library/react';
import { useHeaderManagement } from '@/hooks/useHeaderManagement';
import { resetAllMocks } from '@/__tests__/utils/testUtils';

describe('useHeaderManagement', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty headers by default', () => {
      const { result } = renderHook(() => useHeaderManagement());

      expect(result.current.headers).toEqual({});
      expect(result.current.newHeaderKey).toBe('');
      expect(result.current.newHeaderValue).toBe('');
      expect(result.current.editingHeader).toBe(null);
    });

    it('should initialize with provided headers', () => {
      const initialHeaders = {
        'X-Api-Key': 'test-key',
        'Authorization': 'Bearer token',
      };

      const { result } = renderHook(() =>
        useHeaderManagement({ initialHeaders })
      );

      expect(result.current.headers).toEqual(initialHeaders);
    });

    it('should have valid header value input ref', () => {
      const { result } = renderHook(() => useHeaderManagement());

      expect(result.current.headerValueInputRef).toBeDefined();
    });
  });

  describe('addHeader', () => {
    it('should add header when both key and value are provided', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.setNewHeaderKey('X-Custom-Header');
        result.current.setNewHeaderValue('custom-value');
        result.current.addHeader();
      });

      expect(result.current.headers['X-Custom-Header']).toBe('custom-value');
    });

    it('should clear input fields after adding header', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.setNewHeaderKey('X-Api-Key');
        result.current.setNewHeaderValue('api-key-value');
        result.current.addHeader();
      });

      expect(result.current.newHeaderKey).toBe('');
      expect(result.current.newHeaderValue).toBe('');
    });

    it('should not add header with empty key', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.setNewHeaderKey('');
        result.current.setNewHeaderValue('value');
        result.current.addHeader();
      });

      expect(Object.keys(result.current.headers)).toHaveLength(0);
    });

    it('should not add header with empty value', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.setNewHeaderKey('X-Api-Key');
        result.current.setNewHeaderValue('');
        result.current.addHeader();
      });

      expect(Object.keys(result.current.headers)).toHaveLength(0);
    });

    it('should overwrite existing header with same key', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'old-key' },
        })
      );

      act(() => {
        result.current.setNewHeaderKey('X-Api-Key');
        result.current.setNewHeaderValue('new-key');
        result.current.addHeader();
      });

      expect(result.current.headers['X-Api-Key']).toBe('new-key');
    });

    it('should add multiple headers', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.setNewHeaderKey('Authorization');
        result.current.setNewHeaderValue('Bearer token');
        result.current.addHeader();
      });

      act(() => {
        result.current.setNewHeaderKey('X-Api-Key');
        result.current.setNewHeaderValue('api-key');
        result.current.addHeader();
      });

      expect(Object.keys(result.current.headers)).toHaveLength(2);
      expect(result.current.headers['Authorization']).toBe('Bearer token');
      expect(result.current.headers['X-Api-Key']).toBe('api-key');
    });
  });

  describe('removeHeader', () => {
    it('should remove header by key', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: {
            'X-Api-Key': 'key',
            'Authorization': 'token',
          },
        })
      );

      act(() => {
        result.current.removeHeader('X-Api-Key');
      });

      expect(result.current.headers['X-Api-Key']).toBeUndefined();
      expect(result.current.headers['Authorization']).toBe('token');
    });

    it('should handle removing non-existent header', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'key' },
        })
      );

      act(() => {
        result.current.removeHeader('Non-Existent');
      });

      expect(result.current.headers['X-Api-Key']).toBe('key');
    });

    it('should remove multiple headers', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: {
            'X-Api-Key': 'key',
            'Authorization': 'token',
            'X-Custom': 'value',
          },
        })
      );

      act(() => {
        result.current.removeHeader('X-Api-Key');
        result.current.removeHeader('X-Custom');
      });

      expect(Object.keys(result.current.headers)).toHaveLength(1);
      expect(result.current.headers['Authorization']).toBe('token');
    });
  });

  describe('editing headers', () => {
    it('should start editing header with current values', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'current-value' },
        })
      );

      act(() => {
        result.current.startEditingHeader('X-Api-Key');
      });

      expect(result.current.editingHeader).toBe('X-Api-Key');
      expect(result.current.editingKey).toBe('X-Api-Key');
      expect(result.current.editingValue).toBe('current-value');
    });

    it('should cancel editing without changing state', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'original-value' },
        })
      );

      act(() => {
        result.current.startEditingHeader('X-Api-Key');
        result.current.setEditingKey('X-New-Key');
        result.current.setEditingValue('new-value');
        result.current.cancelEditingHeader();
      });

      expect(result.current.editingHeader).toBe(null);
      expect(result.current.headers['X-Api-Key']).toBe('original-value');
      expect(result.current.headers['X-New-Key']).toBeUndefined();
    });

    it('should save edited header with new key and value', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'old-key' },
        })
      );

      act(() => {
        result.current.startEditingHeader('X-Api-Key');
        result.current.setEditingKey('X-New-Key');
        result.current.setEditingValue('new-value');
        result.current.saveEditingHeader();
      });

      expect(result.current.headers['X-New-Key']).toBe('new-value');
      expect(result.current.headers['X-Api-Key']).toBeUndefined();
      expect(result.current.editingHeader).toBe(null);
    });

    it('should handle key renaming correctly', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: {
            'Old-Header': 'value',
            'Other-Header': 'other',
          },
        })
      );

      act(() => {
        result.current.startEditingHeader('Old-Header');
        result.current.setEditingKey('New-Header');
        result.current.saveEditingHeader();
      });

      expect(result.current.headers['New-Header']).toBe('value');
      expect(result.current.headers['Old-Header']).toBeUndefined();
      expect(result.current.headers['Other-Header']).toBe('other');
    });

    it('should handle value-only updates', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'old-value' },
        })
      );

      act(() => {
        result.current.startEditingHeader('X-Api-Key');
        result.current.setEditingValue('new-value');
        result.current.saveEditingHeader();
      });

      expect(result.current.headers['X-Api-Key']).toBe('new-value');
    });

    it('should not save with empty key', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'value' },
        })
      );

      act(() => {
        result.current.startEditingHeader('X-Api-Key');
        result.current.setEditingKey('');
        result.current.setEditingValue('new-value');
        result.current.saveEditingHeader();
      });

      expect(result.current.headers['X-Api-Key']).toBe('value');
      expect(result.current.editingHeader).toBe(null);
    });

    it('should not save with empty value', () => {
      const { result } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'value' },
        })
      );

      act(() => {
        result.current.startEditingHeader('X-Api-Key');
        result.current.setEditingValue('');
        result.current.saveEditingHeader();
      });

      expect(result.current.headers['X-Api-Key']).toBe('value');
      expect(result.current.editingHeader).toBe(null);
    });
  });

  describe('quick headers', () => {
    it('should set API key template', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.addQuickHeader('api-key');
      });

      expect(result.current.newHeaderKey).toBe('X-Api-Key');
      expect(result.current.newHeaderValue).toBe('');
    });

    it('should set Bearer token template', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.addQuickHeader('bearer');
      });

      expect(result.current.newHeaderKey).toBe('Authorization');
      expect(result.current.newHeaderValue).toBe('Bearer ');
    });

    it('should set Basic auth template', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.addQuickHeader('basic');
      });

      expect(result.current.newHeaderKey).toBe('Authorization');
      expect(result.current.newHeaderValue).toBe('Basic ');
    });
  });

  describe('state management', () => {
    it('should maintain independent header states', () => {
      const { result: result1 } = renderHook(() => useHeaderManagement());
      const { result: result2 } = renderHook(() =>
        useHeaderManagement({
          initialHeaders: { 'X-Api-Key': 'key' },
        })
      );

      act(() => {
        result1.current.setNewHeaderKey('Authorization');
        result1.current.setNewHeaderValue('Bearer token');
        result1.current.addHeader();
      });

      expect(result1.current.headers['Authorization']).toBe('Bearer token');
      expect(result2.current.headers['Authorization']).toBeUndefined();
      expect(result2.current.headers['X-Api-Key']).toBe('key');
    });

    it('should handle complex header values', () => {
      const { result } = renderHook(() => useHeaderManagement());

      const complexValue =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      act(() => {
        result.current.setNewHeaderKey('Authorization');
        result.current.setNewHeaderValue(complexValue);
        result.current.addHeader();
      });

      expect(result.current.headers['Authorization']).toBe(complexValue);
    });

    it('should preserve order of headers', () => {
      const { result } = renderHook(() => useHeaderManagement());

      act(() => {
        result.current.setNewHeaderKey('First');
        result.current.setNewHeaderValue('1');
        result.current.addHeader();

        result.current.setNewHeaderKey('Second');
        result.current.setNewHeaderValue('2');
        result.current.addHeader();

        result.current.setNewHeaderKey('Third');
        result.current.setNewHeaderValue('3');
        result.current.addHeader();
      });

      const keys = Object.keys(result.current.headers);
      expect(keys).toEqual(['First', 'Second', 'Third']);
    });
  });
});
