/**
 * Comprehensive Error Handler
 * Categorizes errors and provides recovery strategies
 */

export enum ErrorCategory {
  // Client errors (4xx)
  BAD_REQUEST = "BAD_REQUEST", // 400
  UNAUTHORIZED = "UNAUTHORIZED", // 401
  FORBIDDEN = "FORBIDDEN", // 403
  NOT_FOUND = "NOT_FOUND", // 404
  CONFLICT = "CONFLICT", // 409
  UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY", // 422
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS", // 429

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR", // 500
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE", // 503
  GATEWAY_TIMEOUT = "GATEWAY_TIMEOUT", // 504

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  CORS_ERROR = "CORS_ERROR",

  // Data errors
  INVALID_DATA = "INVALID_DATA",
  PARSING_ERROR = "PARSING_ERROR",

  // Configuration errors
  MISSING_API_KEY = "MISSING_API_KEY",
  INVALID_URL = "INVALID_URL",
  MISSING_URL = "MISSING_URL",

  // WebSocket errors
  WEBSOCKET_CONNECTION_FAILED = "WEBSOCKET_CONNECTION_FAILED",
  WEBSOCKET_DISCONNECTED = "WEBSOCKET_DISCONNECTED",
  WEBSOCKET_MESSAGE_ERROR = "WEBSOCKET_MESSAGE_ERROR",
  WEBSOCKET_SUBSCRIPTION_FAILED = "WEBSOCKET_SUBSCRIPTION_FAILED",

  // Unknown
  UNKNOWN = "UNKNOWN",
}

export enum RecoveryStrategy {
  RETRY_IMMEDIATELY = "RETRY_IMMEDIATELY",
  RETRY_WITH_BACKOFF = "RETRY_WITH_BACKOFF",
  RETRY_AFTER_RATE_LIMIT = "RETRY_AFTER_RATE_LIMIT",
  WAIT_AND_RETRY = "WAIT_AND_RETRY",
  USE_CACHE = "USE_CACHE",
  FAIL = "FAIL",
  FALLBACK = "FALLBACK",
}

export interface ErrorMetadata {
  statusCode?: number;
  statusText?: string;
  retryAfter?: number;
  originalError?: Error;
  context?: Record<string, unknown>;
}

export interface ApiError extends Error {
  category: ErrorCategory;
  statusCode?: number;
  statusText?: string;
  retryAfter?: number;
  recoveryStrategy: RecoveryStrategy;
  isRetryable: boolean;
  metadata: ErrorMetadata;
}

/**
 * Categorize HTTP status code to error category
 */
function categorizeStatusCode(status: number): ErrorCategory {
  if (status === 400) return ErrorCategory.BAD_REQUEST;
  if (status === 401) return ErrorCategory.UNAUTHORIZED;
  if (status === 403) return ErrorCategory.FORBIDDEN;
  if (status === 404) return ErrorCategory.NOT_FOUND;
  if (status === 409) return ErrorCategory.CONFLICT;
  if (status === 422) return ErrorCategory.UNPROCESSABLE_ENTITY;
  if (status === 429) return ErrorCategory.TOO_MANY_REQUESTS;
  if (status >= 500 && status < 600) {
    if (status === 503) return ErrorCategory.SERVICE_UNAVAILABLE;
    if (status === 504) return ErrorCategory.GATEWAY_TIMEOUT;
    return ErrorCategory.INTERNAL_SERVER_ERROR;
  }
  return ErrorCategory.UNKNOWN;
}

/**
 * Categorize error message to detect specific error types
 */
function categorizeErrorMessage(message: string): ErrorCategory {
  if (message.includes("CORS")) return ErrorCategory.CORS_ERROR;
  if (message.includes("timeout")) return ErrorCategory.TIMEOUT;
  if (message.includes("NetworkError")) return ErrorCategory.NETWORK_ERROR;
  if (message.includes("API key") || message.includes("api_key")) {
    return ErrorCategory.MISSING_API_KEY;
  }
  if (message.includes("invalid URL")) return ErrorCategory.INVALID_URL;
  if (message.includes("URL is required")) return ErrorCategory.MISSING_URL;
  if (message.includes("JSON")) return ErrorCategory.PARSING_ERROR;
  if (message.includes("Invalid data")) return ErrorCategory.INVALID_DATA;
  return ErrorCategory.UNKNOWN;
}

/**
 * Determine recovery strategy based on error category
 */
function determineRecoveryStrategy(
  category: ErrorCategory,
  retryAttempt: number = 0
): RecoveryStrategy {
  switch (category) {
    case ErrorCategory.TOO_MANY_REQUESTS:
      return RecoveryStrategy.RETRY_AFTER_RATE_LIMIT;
    case ErrorCategory.GATEWAY_TIMEOUT:
    case ErrorCategory.SERVICE_UNAVAILABLE:
      return retryAttempt < 3
        ? RecoveryStrategy.RETRY_WITH_BACKOFF
        : RecoveryStrategy.USE_CACHE;
    case ErrorCategory.NETWORK_ERROR:
    case ErrorCategory.TIMEOUT:
      return retryAttempt < 2
        ? RecoveryStrategy.RETRY_IMMEDIATELY
        : RecoveryStrategy.USE_CACHE;
    case ErrorCategory.INTERNAL_SERVER_ERROR:
      return RecoveryStrategy.RETRY_WITH_BACKOFF;
    case ErrorCategory.CORS_ERROR:
      return RecoveryStrategy.FAIL; // Can't retry CORS errors on client
    case ErrorCategory.BAD_REQUEST:
    case ErrorCategory.INVALID_DATA:
    case ErrorCategory.PARSING_ERROR:
    case ErrorCategory.MISSING_API_KEY:
    case ErrorCategory.INVALID_URL:
    case ErrorCategory.MISSING_URL:
      return RecoveryStrategy.FAIL; // Configuration errors, won't fix by retrying
    case ErrorCategory.UNAUTHORIZED:
    case ErrorCategory.FORBIDDEN:
      return RecoveryStrategy.FAIL; // Auth errors won't fix by retrying
    case ErrorCategory.NOT_FOUND:
      return RecoveryStrategy.FAIL; // 404s won't fix by retrying
    // WebSocket errors - attempt reconnection with backoff
    case ErrorCategory.WEBSOCKET_CONNECTION_FAILED:
    case ErrorCategory.WEBSOCKET_DISCONNECTED:
    case ErrorCategory.WEBSOCKET_MESSAGE_ERROR:
      return retryAttempt < 5
        ? RecoveryStrategy.RETRY_WITH_BACKOFF
        : RecoveryStrategy.USE_CACHE;
    case ErrorCategory.WEBSOCKET_SUBSCRIPTION_FAILED:
      return RecoveryStrategy.RETRY_WITH_BACKOFF;
    default:
      return RecoveryStrategy.RETRY_WITH_BACKOFF;
  }
}

/**
 * Check if an error is retryable
 */
function isErrorRetryable(category: ErrorCategory): boolean {
  const retryableCategories = [
    ErrorCategory.TOO_MANY_REQUESTS,
    ErrorCategory.INTERNAL_SERVER_ERROR,
    ErrorCategory.SERVICE_UNAVAILABLE,
    ErrorCategory.GATEWAY_TIMEOUT,
    ErrorCategory.NETWORK_ERROR,
    ErrorCategory.TIMEOUT,
    // WebSocket errors are retryable
    ErrorCategory.WEBSOCKET_CONNECTION_FAILED,
    ErrorCategory.WEBSOCKET_DISCONNECTED,
    ErrorCategory.WEBSOCKET_MESSAGE_ERROR,
    ErrorCategory.WEBSOCKET_SUBSCRIPTION_FAILED,
  ];
  return retryableCategories.includes(category);
}

/**
 * Parse Retry-After header (can be seconds or HTTP date)
 */
function parseRetryAfter(retryAfterHeader: string): number {
  if (!retryAfterHeader) return 60; // Default to 60 seconds

  const seconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(seconds)) {
    return seconds;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfterHeader);
  if (!isNaN(date.getTime())) {
    return Math.ceil((date.getTime() - Date.now()) / 1000);
  }

  return 60; // Default fallback
}

/**
 * Create a standardized API error
 */
export function createApiError(
  message: string,
  metadata: ErrorMetadata = {},
  retryAttempt: number = 0
): ApiError {
  const statusCode = metadata.statusCode;
  let category = ErrorCategory.UNKNOWN;

  // Determine category
  if (statusCode) {
    category = categorizeStatusCode(statusCode);
  } else {
    category = categorizeErrorMessage(message);
  }

  // Determine recovery strategy
  const recoveryStrategy = determineRecoveryStrategy(category, retryAttempt);
  const isRetryable = isErrorRetryable(category);

  const error = new Error(message) as ApiError;
  error.name = "ApiError";
  error.category = category;
  error.statusCode = statusCode;
  error.statusText = metadata.statusText;
  error.retryAfter = metadata.retryAfter;
  error.recoveryStrategy = recoveryStrategy;
  error.isRetryable = isRetryable;
  error.metadata = metadata;

  return error;
}

/**
 * Handle API response and throw formatted error if needed
 */
export async function handleApiResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  let data: unknown;

  try {
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const message = extractErrorMessage(data, response.status, response.statusText || "");

    throw createApiError(message, {
      statusCode: response.status,
      statusText: response.statusText || undefined,
      retryAfter: retryAfter ? parseRetryAfter(retryAfter) : undefined,
      context: { responseData: data },
    });
  }

  return data;
}

/**
 * Extract meaningful error message from various response formats
 */
export function extractErrorMessage(
  data: unknown,
  status: number,
  statusText: string
): string {
  if (typeof data === "string" && data) {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const dataObj = data as Record<string, unknown>;

    // Common error message fields
    const errorFields = [
      "error",
      "message",
      "msg",
      "description",
      "reason",
      "detail",
    ];
    for (const field of errorFields) {
      if (dataObj[field]) {
        const value = dataObj[field];
        if (typeof value === "string") {
          return value;
        } else if (typeof value === "object" && value !== null) {
          const msg = (value as Record<string, unknown>)["message"];
          if (typeof msg === "string") return msg;
        }
      }
    }

    // Errors array (common in validation errors)
    if (Array.isArray(dataObj.errors) && dataObj.errors.length > 0) {
      const firstError = dataObj.errors[0];
      if (typeof firstError === "string") return firstError;
      if (typeof firstError === "object" && (firstError as Record<string, unknown>)["message"]) {
        return String((firstError as Record<string, unknown>)["message"]);
      }
    }
  }

  // Fallback to status text
  return statusText || `HTTP Error ${status}`;
}

/**
 * Format error for user display
 */
export function formatErrorForDisplay(error: ApiError): string {
  switch (error.category) {
    case ErrorCategory.TOO_MANY_REQUESTS:
      return `Rate limit exceeded. Please try again in ${error.retryAfter || 60} seconds.`;
    case ErrorCategory.UNAUTHORIZED:
      return "Authentication failed. Please check your API credentials.";
    case ErrorCategory.FORBIDDEN:
      return "Access denied. You don't have permission to access this resource.";
    case ErrorCategory.NOT_FOUND:
      return "Resource not found. Please check your API URL and parameters.";
    case ErrorCategory.NETWORK_ERROR:
      return "Network error. Please check your internet connection.";
    case ErrorCategory.TIMEOUT:
      return "Request timed out. The server took too long to respond.";
    case ErrorCategory.CORS_ERROR:
      return "CORS error. The API doesn't allow requests from this domain.";
    case ErrorCategory.SERVICE_UNAVAILABLE:
      return "Service unavailable. The API is temporarily down. Retrying...";
    case ErrorCategory.GATEWAY_TIMEOUT:
      return "Gateway timeout. The API is taking too long to respond.";
    case ErrorCategory.MISSING_API_KEY:
      return "API key is missing. Please configure it in widget settings.";
    case ErrorCategory.INVALID_URL:
      return "Invalid API URL. Please check the URL format.";
    case ErrorCategory.MISSING_URL:
      return "API URL is not configured. Please add it in widget settings.";
    case ErrorCategory.INVALID_DATA:
      return "Received invalid data from API. The data format might not be supported.";
    case ErrorCategory.PARSING_ERROR:
      return "Failed to parse API response. The response format might not be supported.";
    case ErrorCategory.WEBSOCKET_CONNECTION_FAILED:
      return "Failed to connect to real-time data service. Attempting to reconnect...";
    case ErrorCategory.WEBSOCKET_DISCONNECTED:
      return "Real-time connection was lost. Attempting to reconnect...";
    case ErrorCategory.WEBSOCKET_MESSAGE_ERROR:
      return "Error processing real-time data. Retrying...";
    case ErrorCategory.WEBSOCKET_SUBSCRIPTION_FAILED:
      return "Failed to subscribe to real-time updates. Using polling instead.";
    default:
      return error.message || "An unknown error occurred.";
  }
}

/**
 * Calculate backoff delay for retries
 * Uses exponential backoff with jitter
 */
export function calculateBackoffDelay(
  retryAttempt: number,
  minDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // Exponential backoff: 2^attempt * minDelay
  const exponentialDelay = Math.pow(2, retryAttempt) * minDelay;

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add random jitter (±10%)
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * Check if we should retry based on error and attempt count
 */
export function shouldRetry(
  error: unknown,
  maxRetries: number = 3,
  currentAttempt: number = 0
): boolean {
  if (currentAttempt >= maxRetries) return false;

  if (error instanceof Error && "isRetryable" in error) {
    return (error as ApiError).isRetryable;
  }

  // Generic retry logic for non-categorized errors
  const message = (error as Error).message || "";
  return (
    message.includes("timeout") ||
    message.includes("NETWORK") ||
    message.includes("503") ||
    message.includes("429")
  );
}

/**
 * Create WebSocket-specific errors
 */
export function createWebSocketError(
  message: string,
  category: ErrorCategory.WEBSOCKET_CONNECTION_FAILED |
    ErrorCategory.WEBSOCKET_DISCONNECTED |
    ErrorCategory.WEBSOCKET_MESSAGE_ERROR |
    ErrorCategory.WEBSOCKET_SUBSCRIPTION_FAILED,
  metadata: ErrorMetadata = {}
): ApiError {
  return createApiError(message, {
    ...metadata,
    context: {
      ...metadata.context,
      errorSource: 'websocket',
    },
  });
}

/**
 * Categorize WebSocket close code
 */
export function categorizeWebSocketCloseCode(code: number): ErrorCategory {
  switch (code) {
    case 1000: // Normal closure - not an error
      return ErrorCategory.NETWORK_ERROR;
    case 1001: // Going away
      return ErrorCategory.NETWORK_ERROR;
    case 1002: // Protocol error
      return ErrorCategory.INVALID_DATA;
    case 1003: // Unsupported data
      return ErrorCategory.INVALID_DATA;
    case 1006: // Abnormal closure
      return ErrorCategory.WEBSOCKET_DISCONNECTED;
    case 1008: // Policy violation
      return ErrorCategory.FORBIDDEN;
    case 1011: // Server error
      return ErrorCategory.WEBSOCKET_CONNECTION_FAILED;
    case 1012: // Service restart
      return ErrorCategory.SERVICE_UNAVAILABLE;
    case 1013: // Try again later
      return ErrorCategory.SERVICE_UNAVAILABLE;
    default:
      return ErrorCategory.WEBSOCKET_CONNECTION_FAILED;
  }
}

/**
 * Check if WebSocket error is network-related (should retry)
 */
export function isWebSocketNetworkError(error: Error): boolean {
  const message = error.message || '';
  return (
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNRESET') ||
    message.includes('Network') ||
    message.includes('timeout') ||
    message.includes('Failed to fetch')
  );
}