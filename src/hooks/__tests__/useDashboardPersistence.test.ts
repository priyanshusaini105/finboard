/**
 * Tests for useDashboardPersistence hook
 */

import { renderHook } from '@testing-library/react';
import { useDashboardPersistence } from '@/hooks/useDashboardPersistence';
import * as store from '@/store/useStore';
import { resetAllMocks } from '@/__tests__/utils/testUtils';

jest.mock('@/store/useStore');

describe('useDashboardPersistence', () => {
  const mockSetTheme = jest.fn();
  const mockSetLayoutMode = jest.fn();
  const mockSetGlobalRefreshInterval = jest.fn();

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    (store.useStore as jest.Mock).mockReturnValue({
      theme: 'light',
      layoutMode: 'grid',
      refreshInterval: 30,
      setTheme: mockSetTheme,
      setLayoutMode: mockSetLayoutMode,
      setGlobalRefreshInterval: mockSetGlobalRefreshInterval,
    });
  });

  describe('initialization - loading from localStorage', () => {
    it('should load configuration from localStorage on mount', () => {
      const config = {
        theme: 'dark',
        layoutMode: 'list',
        refreshInterval: 60,
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(config)
      );

      renderHook(() => useDashboardPersistence());

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(mockSetLayoutMode).toHaveBeenCalledWith('list');
      expect(mockSetGlobalRefreshInterval).toHaveBeenCalledWith(60);
    });

    it('should handle missing localStorage gracefully', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      renderHook(() => useDashboardPersistence());

      expect(mockSetTheme).not.toHaveBeenCalled();
      expect(mockSetLayoutMode).not.toHaveBeenCalled();
      expect(mockSetGlobalRefreshInterval).not.toHaveBeenCalled();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('invalid json {]');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useDashboardPersistence());

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSetTheme).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should skip loading when window is undefined', () => {
      const originalWindow = global.window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = undefined;

      renderHook(() => useDashboardPersistence());

      expect(mockSetTheme).not.toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = originalWindow;
    });

    it('should handle partial configuration', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partialConfig: any = {
        theme: 'dark',
        layoutMode: undefined,
        refreshInterval: undefined,
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(partialConfig)
      );

      renderHook(() => useDashboardPersistence());

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(mockSetLayoutMode).not.toHaveBeenCalled();
      expect(mockSetGlobalRefreshInterval).not.toHaveBeenCalled();
    });
  });

  describe('persisting changes', () => {
    it('should save theme changes to localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      (store.useStore as jest.Mock).mockReturnValue({
        theme: 'dark',
        layoutMode: 'grid',
        refreshInterval: 30,
        setTheme: mockSetTheme,
        setLayoutMode: mockSetLayoutMode,
        setGlobalRefreshInterval: mockSetGlobalRefreshInterval,
      });

      renderHook(() => useDashboardPersistence());

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'finboard_dashboard_config',
        JSON.stringify({
          theme: 'dark',
          layoutMode: 'grid',
          refreshInterval: 30,
        })
      );
    });

    it('should save layout mode changes to localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      (store.useStore as jest.Mock).mockReturnValue({
        theme: 'light',
        layoutMode: 'list',
        refreshInterval: 30,
        setTheme: mockSetTheme,
        setLayoutMode: mockSetLayoutMode,
        setGlobalRefreshInterval: mockSetGlobalRefreshInterval,
      });

      renderHook(() => useDashboardPersistence());

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'finboard_dashboard_config',
        JSON.stringify({
          theme: 'light',
          layoutMode: 'list',
          refreshInterval: 30,
        })
      );
    });

    it('should save refresh interval changes to localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      (store.useStore as jest.Mock).mockReturnValue({
        theme: 'light',
        layoutMode: 'grid',
        refreshInterval: 60,
        setTheme: mockSetTheme,
        setLayoutMode: mockSetLayoutMode,
        setGlobalRefreshInterval: mockSetGlobalRefreshInterval,
      });

      renderHook(() => useDashboardPersistence());

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'finboard_dashboard_config',
        JSON.stringify({
          theme: 'light',
          layoutMode: 'grid',
          refreshInterval: 60,
        })
      );
    });

    it('should not save when window is undefined', () => {
      const originalWindow = global.window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = undefined;

      renderHook(() => useDashboardPersistence());

      expect(localStorage.setItem).not.toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = originalWindow;
    });

    it('should handle localStorage write errors', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      (localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useDashboardPersistence());

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('configuration persistence', () => {
    it('should persist all configuration values together', () => {
      const config = {
        theme: 'dark' as const,
        layoutMode: 'list' as const,
        refreshInterval: 45,
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      (store.useStore as jest.Mock).mockReturnValue({
        ...config,
        setTheme: mockSetTheme,
        setLayoutMode: mockSetLayoutMode,
        setGlobalRefreshInterval: mockSetGlobalRefreshInterval,
      });

      renderHook(() => useDashboardPersistence());

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'finboard_dashboard_config',
        JSON.stringify(config)
      );
    });

    it('should restore and apply loaded configuration', () => {
      const savedConfig = {
        theme: 'dark',
        layoutMode: 'list',
        refreshInterval: 120,
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(savedConfig)
      );

      renderHook(() => useDashboardPersistence());

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(mockSetLayoutMode).toHaveBeenCalledWith('list');
      expect(mockSetGlobalRefreshInterval).toHaveBeenCalledWith(120);
    });
  });

  describe('edge cases', () => {
    it('should handle empty localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      renderHook(() => useDashboardPersistence());

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'finboard_dashboard_config',
        JSON.stringify({
          theme: 'light',
          layoutMode: 'grid',
          refreshInterval: 30,
        })
      );
    });

    it('should handle configuration with all fields present', () => {
      const completeConfig = {
        theme: 'dark',
        layoutMode: 'list',
        refreshInterval: 90,
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(completeConfig)
      );

      renderHook(() => useDashboardPersistence());

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(mockSetLayoutMode).toHaveBeenCalledWith('list');
      expect(mockSetGlobalRefreshInterval).toHaveBeenCalledWith(90);
    });

    it('should ignore extra fields in stored configuration', () => {
      const configWithExtra = {
        theme: 'dark',
        layoutMode: 'list',
        refreshInterval: 60,
        extraField: 'should be ignored',
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(configWithExtra)
      );

      renderHook(() => useDashboardPersistence());

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(mockSetLayoutMode).toHaveBeenCalledWith('list');
      expect(mockSetGlobalRefreshInterval).toHaveBeenCalledWith(60);
    });
  });
});
