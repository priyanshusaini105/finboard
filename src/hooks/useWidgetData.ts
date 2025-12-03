import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { Widget } from "../types/widget";
import { transformData } from "../utils/apiAdapters";

// Generate a unique query key for each widget
const generateQueryKey = (widget: Widget) => [
  "widget-data",
  widget.id,
  widget.apiUrl,
  widget.headers,
  widget.selectedFields,
];

// Function to fetch and transform widget data
const fetchWidgetData = async (widget: Widget) => {
  try {
    // Check if we need to use proxy for external APIs
    const needsProxy =
      widget.apiUrl?.includes("finnhub.io") ||
      widget.apiUrl?.includes("alphavantage.co");

    let response;

    if (needsProxy) {
      // Use proxy for external APIs that have CORS issues
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(
        widget.apiUrl || ""
      )}`;
      response = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(widget.headers || {}),
        },
      });
    } else {
      // Direct request for APIs without CORS issues
      response = await fetch(widget.apiUrl || "", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(widget.headers || {}),
        },
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();

    // Transform data based on widget type using universal adapter
    const transformedData = transformData(
      rawData,
      widget.type as "chart" | "table" | "card"
    );

    return {
      data: transformedData,
      originalData: rawData,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch data for ${widget.title}: ${(error as Error).message}`
    );
  }
};

// Custom hook for fetching widget data with caching
export const useWidgetData = (
  widget: Widget,
  options?: Partial<UseQueryOptions<any, Error>>
) => {
  const result = useQuery({
    queryKey: generateQueryKey(widget),
    queryFn: async () => {
      console.log(
        `🌐 [TanStack Query] Fetching fresh data for: ${widget.title}`
      );
      const result = await fetchWidgetData(widget);
      console.log(
        `✅ [TanStack Query] Data fetched for: ${widget.title}`,
        result
      );
      return result;
    },
    enabled: !!widget.apiUrl, // Only run query if API URL exists
    staleTime: widget.refreshInterval
      ? widget.refreshInterval * 1000
      : 5 * 60 * 1000, // Use widget's refresh interval or default 5 min
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: widget.refreshInterval
      ? widget.refreshInterval * 1000
      : undefined, // Auto-refetch based on widget settings
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    ...options,
  });

  // Log cache hits
  if (result.data && !result.isFetching) {
    console.log(`🎯 [TanStack Query] Using cached data for: ${widget.title}`);
  }

  return result;
};

// Hook to prefetch widget data (useful for preloading)
export const usePrefetchWidgetData = () => {
  const queryClient = useQueryClient();

  return (widget: Widget) => {
    queryClient.prefetchQuery({
      queryKey: generateQueryKey(widget),
      queryFn: () => fetchWidgetData(widget),
      staleTime: widget.refreshInterval
        ? widget.refreshInterval * 1000
        : 5 * 60 * 1000,
    });
  };
};
