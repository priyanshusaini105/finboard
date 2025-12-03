import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { Widget } from "../types/widget";
import { transformData } from "../utils/apiAdapters";
import {
  loadTransformedData,
  getTableData,
  getChartData,
  getCardData,
} from "../utils/transformedDataLoader";
import {
  transformApiData,
  shouldTransformApi,
} from "../utils/apiTransformationService";
import {
  createApiError,
  handleApiResponse,
  formatErrorForDisplay,
  calculateBackoffDelay,
  ErrorCategory,
  RecoveryStrategy,
  type ApiError,
} from "../utils/errorHandler";
import {
  getRateLimiterForUrl,
  waitForRateLimitReset,
} from "../utils/rateLimiter";
import type { ColumnDefinition } from "../utils/commonFinancialSchema";

interface WidgetDataResult {
  data: unknown;
  originalData: unknown;
  columns?: ColumnDefinition[];
  fromCache?: boolean;
  rateLimitInfo?: {
    tokensRemaining: number;
    resetTime: number;
  };
  useTransformedData?: boolean;
}

interface FetchOptions {
  retryAttempt?: number;
  skipCache?: boolean;
}

// Generate a unique query key for each widget
const generateQueryKey = (widget: Widget) => [
  "widget-data",
  widget.id,
  widget.apiUrl,
  widget.headers,
  widget.selectedFields,
];

/**
 * Extract rate limit headers from response
 */
function extractRateLimitInfo(response: Response): {
  tokensRemaining: number;
  resetTime: number;
} | null {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");

  if (remaining !== null && reset !== null) {
    return {
      tokensRemaining: parseInt(remaining, 10),
      resetTime: parseInt(reset, 10) * 1000,
    };
  }

  return null;
}

/**
 * Check client-side rate limiting and wait if needed
 */
async function checkClientRateLimit(apiUrl: string | undefined): Promise<void> {
  if (!apiUrl) return;

  const limiter = getRateLimiterForUrl(apiUrl);
  const status = limiter.checkLimit();

  if (!status.allowed) {
    console.warn(
      `[Rate Limit] Client-side rate limit exceeded for ${apiUrl}. Waiting...`,
      { retryAfter: status.retryAfter }
    );
    await waitForRateLimitReset(limiter);
  }
}

/**
 * Main function to fetch and transform widget data with comprehensive error handling
 */
const fetchWidgetData = async (
  widget: Widget,
  options: FetchOptions = {}
): Promise<WidgetDataResult> => {
  const { retryAttempt = 0 } = options;

  try {
    // Validate widget configuration
    if (!widget.apiUrl) {
      throw createApiError("API URL is not configured", {
        context: { widgetId: widget.id, widgetTitle: widget.title },
      });
    }

    // Try to use transformed data first (from common schema)
    try {
      const transformedResponse = await loadTransformedData(widget.apiUrl);
      
      if (transformedResponse.success) {
        console.log(
          `✅ [Transformed Data] Using pre-transformed data for ${widget.title}`,
          { dataType: transformedResponse.data.dataType }
        );

        let data: unknown;
        const columns = transformedResponse.data.columns;

        // Transform based on widget type
        switch (widget.type) {
          case 'table':
            const tableData = getTableData(transformedResponse.data);
            data = tableData.rows;
            break;
          case 'chart':
            data = getChartData(transformedResponse.data);
            break;
          case 'card':
            data = getCardData(transformedResponse.data);
            break;
          default:
            data = transformedResponse.data.rows;
        }

        return {
          data,
          originalData: transformedResponse.data,
          columns,
          fromCache: false,
          useTransformedData: true,
        };
      }
    } catch (transformError) {
      console.warn(
        `[Transformed Data] Failed to load transformed data, falling back to raw API:`,
        transformError
      );
    }

    // Fallback: Fetch from raw API
    // Check client-side rate limiting
    await checkClientRateLimit(widget.apiUrl);

    // Determine if we need to use proxy for external APIs
    const needsProxy =
      widget.apiUrl.includes("finnhub.io") ||
      widget.apiUrl.includes("alphavantage.co");

    const requestUrl = needsProxy
      ? `/api/proxy?url=${encodeURIComponent(widget.apiUrl)}`
      : widget.apiUrl;

    console.log(
      `[Fetch Widget] Fetching data for ${widget.title} (attempt ${retryAttempt + 1})`,
      { url: widget.apiUrl, needsProxy }
    );

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(widget.headers || {}),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Extract rate limit info from response headers
    const rateLimitInfo = extractRateLimitInfo(response);

    if (rateLimitInfo) {
      console.log(
        `[Rate Limit Info] ${widget.title}:`,
        rateLimitInfo
      );
    }

    // Handle API response (throws on error)
    const rawData = await handleApiResponse(response);
    
    console.log(`🔍 [Fetch Widget] Raw data received for ${widget.title}:`, {
      dataKeys: rawData && typeof rawData === 'object' ? Object.keys(rawData as Record<string, unknown>) : [],
      dataType: typeof rawData,
      sample: JSON.stringify(rawData).substring(0, 200)
    });

    // Try to transform the raw data to common schema
    if (shouldTransformApi(widget.apiUrl)) {
      try {
        console.log(`🔄 [Fetch Widget] Attempting transformation for ${widget.title}...`);
        const transformedResponse = await transformApiData(rawData, widget.apiUrl);
        
        console.log(`📊 [Fetch Widget] Transformation result:`, {
          success: transformedResponse.success,
          hasColumns: !!transformedResponse.columns,
          columnsCount: transformedResponse.columns?.length,
          hasData: !!transformedResponse.data,
          rowsCount: transformedResponse.data?.rows?.length,
          error: transformedResponse.error
        });
        
        if (transformedResponse.success) {
          console.log(
            `✅ [Fetch Widget] Using transformed data for ${widget.title}`,
            { 
              columns: transformedResponse.columns.length,
              columnKeys: transformedResponse.columns.map(c => c.key),
              rows: transformedResponse.data.rows.length,
              firstRow: transformedResponse.data.rows[0]
            }
          );

          let data: unknown;
          const columns = transformedResponse.columns;

          // Transform based on widget type
          switch (widget.type) {
            case 'table':
              const tableData = getTableData(transformedResponse.data);
              data = tableData.rows;
              console.log(`📋 [Fetch Widget] Table data prepared:`, {
                rowCount: Array.isArray(data) ? data.length : 0,
                firstRow: Array.isArray(data) && data.length > 0 ? data[0] : null
              });
              break;
            case 'chart':
              data = getChartData(transformedResponse.data);
              break;
            case 'card':
              data = getCardData(transformedResponse.data);
              break;
            default:
              data = transformedResponse.data.rows;
          }

          const result = {
            data,
            originalData: transformedResponse.data,
            columns,
            fromCache: false,
            useTransformedData: true,
            rateLimitInfo: rateLimitInfo || undefined,
          };
          
          console.log(`✨ [Fetch Widget] Final result structure:`, {
            hasData: !!result.data,
            dataType: typeof result.data,
            dataIsArray: Array.isArray(result.data),
            dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
            hasColumns: !!result.columns,
            columnsCount: result.columns?.length,
            useTransformedData: result.useTransformedData
          });

          return result;
        } else {
          console.warn(
            `⚠️ [Fetch Widget] Transformation failed, using legacy adapter:`,
            transformedResponse.error
          );
        }
      } catch (transformError) {
        console.error(
          `[Fetch Widget] Transformation error, falling back to legacy adapter:`,
          transformError
        );
      }
    }

    // Legacy fallback: Use old adapter system
    // Determine path hint from selected fields
    const pathHint = widget.selectedFields?.find(f => f.includes("[]"));

    // Transform data based on widget type
    const transformedData = transformData(
      rawData,
      widget.type as "chart" | "table" | "card",
      pathHint
    );

    console.log(
      `✅ [Fetch Widget] Successfully fetched data for ${widget.title}`
    );

    return {
      data: transformedData,
      originalData: rawData,
      fromCache: false,
      rateLimitInfo: rateLimitInfo || undefined,
      useTransformedData: false,
    };
  } catch (error) {
    const apiError = error instanceof Error ? (error as ApiError) : createApiError(
      (error as Error).message || "Unknown error",
      {
        originalError: error as Error,
        context: { widgetId: widget.id, widgetTitle: widget.title },
      }
    );

    console.error(
      `[Fetch Widget Error] Failed to fetch ${widget.title}:`,
      {
        category: apiError.category,
        strategy: apiError.recoveryStrategy,
        message: apiError.message,
        attempt: retryAttempt,
      }
    );

    // Enhance error with recovery info
    (apiError as ApiError & { displayMessage?: string }).displayMessage =
      formatErrorForDisplay(apiError);

    throw apiError;
  }
};

/**
 * Custom hook for fetching widget data with advanced error recovery and rate limiting
 */
export const useWidgetData = (
  widget: Widget,
  options?: Partial<UseQueryOptions<WidgetDataResult, ApiError>>
) => {
  const queryClient = useQueryClient();
  const maxRetries = 5; // Increased from 3 to 5 for better resilience

  const result = useQuery<WidgetDataResult, ApiError>({
    queryKey: generateQueryKey(widget),
    queryFn: async ({ meta }: { meta?: Record<string, unknown> } = {}) => {
      const retryAttempt = (meta?.retry ?? 0) as number;

      try {
        return await fetchWidgetData(widget, { retryAttempt });
      } catch (error) {
        const apiError = error as ApiError;

        // Handle different recovery strategies
        if (apiError.recoveryStrategy === RecoveryStrategy.RETRY_AFTER_RATE_LIMIT) {
          console.log(
            `[Recovery] Waiting for rate limit reset (${apiError.retryAfter}s)...`
          );
          await waitForRateLimitReset(getRateLimiterForUrl(widget.apiUrl || ""));
          // Re-throw to trigger React Query retry
          throw apiError;
        } else if (
          apiError.recoveryStrategy === RecoveryStrategy.RETRY_WITH_BACKOFF
        ) {
          const delay = calculateBackoffDelay(retryAttempt);
          console.log(
            `[Recovery] Exponential backoff retry in ${delay}ms (attempt ${retryAttempt + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          throw apiError;
        } else if (
          apiError.recoveryStrategy === RecoveryStrategy.USE_CACHE &&
          retryAttempt > 0
        ) {
          // Try to use cached data
          console.log(`[Recovery] Falling back to cached data for ${widget.title}`);
          const cachedData =
            queryClient.getQueryData<WidgetDataResult>(
              generateQueryKey(widget)
            );
          if (cachedData) {
            return { ...cachedData, fromCache: true };
          }
          // If no cache available, continue to throw
          throw apiError;
        }

        throw apiError;
      }
    },
    enabled: !!widget.apiUrl,
    staleTime: widget.refreshInterval
      ? widget.refreshInterval * 1000
      : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: widget.refreshInterval
      ? widget.refreshInterval * 1000
      : undefined,
    retry: (failureCount, error) => {
      const apiError = error as ApiError;

      // Don't retry if max retries exceeded
      if (failureCount >= maxRetries) {
        console.warn(
          `[Retry Exhausted] Gave up after ${maxRetries} attempts for ${widget.title}`
        );
        return false;
      }

      // Check if error is retryable
      if (!apiError.isRetryable) {
        console.warn(
          `[Non-Retryable Error] Not retrying: ${apiError.message}`
        );
        return false;
      }

      // Respect retry-after header
      if (
        apiError.category === ErrorCategory.TOO_MANY_REQUESTS &&
        apiError.retryAfter
      ) {
        console.log(
          `[Rate Limited] Will retry after ${apiError.retryAfter}s`
        );
        return true;
      }

      // Retry on retryable errors
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Use calculated backoff for most errors
      return calculateBackoffDelay(attemptIndex);
    },
    ...options,
  });

  // Log cache hits
  if (result.data && !result.isFetching && !result.isLoading) {
    if (result.data.fromCache) {
      console.log(
        `🎯 [Cache Fallback] Using stale cached data for: ${widget.title}`
      );
    } else {
      console.log(`🎯 [Cache Hit] Using cached data for: ${widget.title}`);
    }
  }

  // Return augmented result with recovery information
  return {
    ...result,
    errorMessage: result.error
      ? (result.error as ApiError & { displayMessage?: string })
          .displayMessage || result.error.message
      : null,
    isFromCache: result.data?.fromCache,
    rateLimitInfo: result.data?.rateLimitInfo,
  };
};

/**
 * Hook to prefetch widget data
 */
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

/**
 * Hook to invalidate widget data cache
 */
export const useInvalidateWidgetData = () => {
  const queryClient = useQueryClient();

  return (widget: Widget) => {
    queryClient.invalidateQueries({
      queryKey: generateQueryKey(widget),
    });
  };
};
