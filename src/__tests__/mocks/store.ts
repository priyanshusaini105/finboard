/**
 * Zustand store mocks for testing
 */

import { WidgetData } from '@/types/widget';

export const createMockStore = () => {
  const state = {
    showAddWidgetModal: false,
    showTemplatesModal: false,
    showExpandedModal: false,
    expandedWidget: null as WidgetData | null,
    theme: 'light' as 'light' | 'dark',
    layoutMode: 'edit' as 'edit' | 'view',
    refreshInterval: 30,
    widgets: [] as WidgetData[],
    realtimeWidgetIds: new Set<string>(),
    realtimeConnected: false,
  };

  return {
    setState: jest.fn((updates: Partial<typeof state>) => {
      Object.assign(state, updates);
    }),
    getState: jest.fn(() => state),
    subscribe: jest.fn(() => jest.fn()),
    reset: jest.fn(() => {
      Object.assign(state, {
        showAddWidgetModal: false,
        showTemplatesModal: false,
        showExpandedModal: false,
        expandedWidget: null,
        theme: 'light',
        layoutMode: 'edit',
        refreshInterval: 30,
        widgets: [],
        realtimeWidgetIds: new Set<string>(),
        realtimeConnected: false,
      });
    }),
  };
};

export const createMockWidget = (overrides: Partial<WidgetData> = {}): WidgetData => {
  const id = overrides.id || `widget-${Math.random()}`;
  return {
    id,
    title: overrides.title || 'Test Widget',
    apiUrl: overrides.apiUrl || 'https://api.example.com/data',
    selectedFields: overrides.selectedFields || ['symbol', 'price', 'change'],
    displayType: overrides.displayType || 'table',
    chartType: overrides.chartType || 'line',
    refreshRate: overrides.refreshRate || 30,
    headers: overrides.headers || {},
    urlParams: overrides.urlParams || {},
    useTransformedData: overrides.useTransformedData || false,
    ...overrides,
  };
};

export const createMockWidgetResponse = (overrides: Partial<WidgetData[]> = []) => {
  return [
    createMockWidget(),
    createMockWidget({ id: 'widget-2', title: 'Widget 2' }),
    ...overrides,
  ];
};
