/**
 * ERROR RECOVERY & RATE LIMIT HANDLING - IMPLEMENTATION GUIDE
 * ============================================================
 * 
 * This document outlines the comprehensive error recovery and rate limiting
 * system implemented in FinBoard.
 */

// =============================================================================
// 1. RATE LIMITING SYSTEM
// =============================================================================

/**
 * Location: src/utils/rateLimiter.ts
 * 
 * Features:
 * ✓ Token Bucket Algorithm - Fair rate limiting with gradual token refill
 * ✓ Persistent Storage - Uses localStorage to survive page reloads
 * ✓ Per-API Configuration - Different limits for different APIs
 * ✓ Automatic Reset - Resets when window passes
 * 
 * Pre-configured Limits:
 * - Alpha Vantage: 5 requests per minute
 * - Finnhub: 60 requests per minute
 * - Generic APIs: 30 requests per minute
 * 
 * Usage:
 * 
 *   import { getRateLimiterForUrl, waitForRateLimitReset } from './utils/rateLimiter';
 *   
 *   const limiter = getRateLimiterForUrl(apiUrl);
 *   const status = limiter.checkLimit();
 *   
 *   if (!status.allowed) {
 *     console.log(`Rate limited. Retry after ${status.retryAfter}s`);
 *     await waitForRateLimitReset(limiter);
 *   }
 * 
 * Rate Limiter Metrics:
 * - tokensRemaining: Number of requests available now
 * - resetTime: When the rate limit window resets
 * - retryAfter: Seconds to wait before retry
 */

// =============================================================================
// 2. COMPREHENSIVE ERROR HANDLER
// =============================================================================

/**
 * Location: src/utils/errorHandler.ts
 * 
 * Error Categories (15 types):
 * - Client Errors (4xx):
 *   BAD_REQUEST (400)
 *   UNAUTHORIZED (401)
 *   FORBIDDEN (403)
 *   NOT_FOUND (404)
 *   CONFLICT (409)
 *   UNPROCESSABLE_ENTITY (422)
 *   TOO_MANY_REQUESTS (429)
 * 
 * - Server Errors (5xx):
 *   INTERNAL_SERVER_ERROR (500)
 *   SERVICE_UNAVAILABLE (503)
 *   GATEWAY_TIMEOUT (504)
 * 
 * - Network Errors:
 *   NETWORK_ERROR
 *   TIMEOUT
 *   CORS_ERROR
 * 
 * - Data Errors:
 *   INVALID_DATA
 *   PARSING_ERROR
 * 
 * - Configuration Errors:
 *   MISSING_API_KEY
 *   INVALID_URL
 *   MISSING_URL
 *   UNKNOWN
 * 
 * Recovery Strategies:
 * 1. RETRY_IMMEDIATELY - Retry right away (network issues)
 * 2. RETRY_WITH_BACKOFF - Exponential backoff for server errors
 * 3. RETRY_AFTER_RATE_LIMIT - Wait for Retry-After header
 * 4. WAIT_AND_RETRY - Wait before retrying
 * 5. USE_CACHE - Fall back to cached data
 * 6. FAIL - Don't retry (config errors)
 * 7. FALLBACK - Use fallback strategy
 * 
 * Usage:
 * 
 *   import { createApiError, formatErrorForDisplay } from './utils/errorHandler';
 *   
 *   try {
 *     const response = await fetch(url);
 *     await handleApiResponse(response);
 *   } catch (error) {
 *     const apiError = error as ApiError;
 *     console.log(apiError.category);           // e.g., "TOO_MANY_REQUESTS"
 *     console.log(apiError.recoveryStrategy);   // e.g., "RETRY_AFTER_RATE_LIMIT"
 *     console.log(apiError.isRetryable);        // true/false
 *     console.log(formatErrorForDisplay(apiError)); // User-friendly message
 *   }
 */

// =============================================================================
// 3. ENHANCED API PROXY
// =============================================================================

/**
 * Location: app/api/proxy/route.ts
 * 
 * Server-side Improvements:
 * ✓ Rate Limiting: 60 requests per minute per IP/domain
 * ✓ Timeout Protection: 30-second timeout for all requests
 * ✓ Request Validation: URL format and parameter checking
 * ✓ Error Extraction: Intelligently extracts errors from API responses
 * ✓ Rate-Limit Forwarding: Passes upstream rate limit headers to client
 * ✓ Cleanup: Automatic cleanup of expired rate limit entries
 * 
 * Response Headers:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Requests left in window
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 * 
 * Error Responses Include:
 * - error: Meaningful error message
 * - category: Error type for client handling
 * - statusCode: HTTP status
 * - retryAfter: Seconds to wait (for 429 errors)
 * 
 * Rate Limit Detection:
 * Automatically detects when upstream API is rate limiting and
 * communicates retry timing to client via Retry-After header.
 */

// =============================================================================
// 4. INTELLIGENT DATA FETCHING HOOK
// =============================================================================

/**
 * Location: src/hooks/useWidgetData.ts
 * 
 * Enhanced Features:
 * ✓ Advanced Retry Logic: Context-aware retries based on error type
 * ✓ Exponential Backoff: 2^attempt * delay with jitter
 * ✓ Rate Limit Awareness: Respects client and server rate limits
 * ✓ Cache Fallback: Uses stale cache when retries exhausted
 * ✓ Rate Limit Info: Extracts and provides rate limit headers to UI
 * ✓ Better Error Messages: Human-readable error descriptions
 * 
 * Retry Configuration:
 * - Max Retries: 5 attempts (increased from 3)
 * - Non-retryable Errors: Config/auth/404 errors
 * - Backoff Formula: 2^attempt * 1000ms, capped at 30s, with ±10% jitter
 * 
 * Returned Hook Data:
 * {
 *   data: WidgetDataResult | undefined;
 *   error: ApiError | null;
 *   errorMessage: string | null;              // Human-friendly error
 *   isLoading: boolean;
 *   isFetching: boolean;
 *   isFromCache: boolean;                     // Using fallback cache
 *   rateLimitInfo: {
 *     tokensRemaining: number;
 *     resetTime: number;
 *   } | undefined;
 *   refetch: () => Promise<QueryObserverResult>;
 * }
 * 
 * Recovery Strategies Applied:
 * 
 * Rate Limited (429):
 *   → Wait for rate limit reset (server-side tracking)
 *   → Client-side limiter also prevents further requests
 * 
 * Server Error (5xx):
 *   → Exponential backoff retry (up to 5 times)
 *   → Falls back to cached data if all retries fail
 * 
 * Network/Timeout:
 *   → Immediate retry (1st), then exponential backoff
 *   → Uses cached data if available
 * 
 * Configuration Error (4xx, except 429):
 *   → No retry (fails fast)
 *   → Directs user to configure widget
 */

// =============================================================================
// 5. ENHANCED TABLE WIDGET UI
// =============================================================================

/**
 * Location: src/components/widgets/WidgetTable.tsx
 * 
 * New UI Features:
 * ✓ Detailed Error Display: Shows error type, status code, retry timing
 * ✓ Contextual Actions: "Retry" for retryable errors, "Configure" for config errors
 * ✓ Cache Indicator: Amber dot when using cached data
 * ✓ Rate Limit Badge: Shows remaining requests (color-coded)
 * ✓ Status Indicators:
 *   - Blue dot: Currently loading/fetching
 *   - Amber dot: Using cached data
 *   - Green badge: Plenty of rate limit remaining (>10)
 *   - Amber badge: Low rate limit (1-10)
 *   - Red badge: Rate limit exhausted
 * 
 * Error Display Components:
 * - Icon with error type
 * - User-friendly error message
 * - Technical details (error category, status code)
 * - Contextual action buttons
 * 
 * Footer Enhancements:
 * - Shows "from cache" indicator when using fallback data
 * - Timestamp of last update
 */

// =============================================================================
// 6. RECOVERY FLOW EXAMPLES
// =============================================================================

/**
 * Example 1: Rate Limit Recovery
 * ================================
 * 
 * 1. Widget requests data for "AAPL" stock
 * 2. Alpha Vantage returns 429 (Too Many Requests) with Retry-After: 60
 * 3. Error Handler creates ApiError with:
 *    - category: "TOO_MANY_REQUESTS"
 *    - recoveryStrategy: "RETRY_AFTER_RATE_LIMIT"
 *    - retryAfter: 60
 * 4. useWidgetData detects rate limit and:
 *    - Waits 60 seconds
 *    - Retries request automatically
 * 5. On success, table displays data with "60 left" badge (rate limit info)
 * 
 * 
 * Example 2: Server Error Recovery
 * =================================
 * 
 * 1. Widget requests data
 * 2. API returns 503 Service Unavailable
 * 3. Error Handler assigns RETRY_WITH_BACKOFF strategy
 * 4. Retries happen at:
 *    - Attempt 1: +1s (2^0 * 1000)
 *    - Attempt 2: +2s (2^1 * 1000)
 *    - Attempt 3: +4s (2^2 * 1000)
 *    - Attempt 4: +8s (2^3 * 1000)
 *    - Attempt 5: +16s (2^4 * 1000)
 * 5. If all fail, falls back to cached data with amber indicator
 * 6. User sees: "Service unavailable" message with "Retry" button
 * 
 * 
 * Example 3: Configuration Error
 * ===============================
 * 
 * 1. Widget has invalid API URL
 * 2. Fetch fails immediately with INVALID_URL error
 * 3. Error Handler assigns FAIL strategy (non-retryable)
 * 4. No retries attempted
 * 5. User sees: "Invalid API URL" message with "Configure" button
 * 6. Click Configure to fix the URL
 * 
 * 
 * Example 4: Network Error Recovery
 * ==================================
 * 
 * 1. User's internet temporarily disconnects
 * 2. Fetch throws NetworkError
 * 3. Error Handler assigns RETRY_IMMEDIATELY strategy
 * 4. First retry happens immediately
 * 5. If still fails, switches to exponential backoff
 * 6. Uses cached data if available
 */

// =============================================================================
// 7. CONFIGURATION & LIMITS
// =============================================================================

/**
 * Rate Limit Defaults:
 * 
 * Server-side (proxy):
 * - 60 requests/minute per IP+domain combination
 * - 30-second timeout per request
 * 
 * Client-side:
 * - Alpha Vantage: 5/minute (matches API limit)
 * - Finnhub: 60/minute (matches API limit)
 * - Generic: 30/minute (conservative default)
 * 
 * Retry Limits:
 * - Maximum 5 retry attempts
 * - Exponential backoff: 2^attempt seconds (max 30s)
 * - Random jitter: ±10% of backoff delay
 * 
 * Cache Strategy:
 * - Stale time: 5 minutes (configurable per widget)
 * - GC time: 10 minutes
 * - Fallback to cache on error after 3+ retries
 */

// =============================================================================
// 8. MONITORING & DEBUGGING
// =============================================================================

/**
 * Console Logs for Debugging:
 * 
 * Rate Limiting:
 *   [Rate Limit] Client-side rate limit exceeded for <url>. Waiting...
 *   [Rate Limit Info] <widget>: { tokensRemaining: 5, resetTime: ... }
 * 
 * Data Fetching:
 *   [Fetch Widget] Fetching data for <title> (attempt N)
 *   ✅ [Fetch Widget] Successfully fetched data for <title>
 *   [Fetch Widget Error] Failed to fetch <title>: ...
 * 
 * Retries:
 *   [Retry Exhausted] Gave up after 5 attempts for <title>
 *   [Non-Retryable Error] Not retrying: <message>
 *   [Recovery] Waiting for rate limit reset...
 *   [Recovery] Exponential backoff retry in <ms>...
 * 
 * Cache:
 *   🎯 [Cache Hit] Using cached data for: <title>
 *   🎯 [Cache Fallback] Using stale cached data for: <title>
 * 
 * Server-side:
 *   [API Proxy] Proxying request to: <url>
 *   [API Proxy] Rate limited by upstream API
 *   [API Proxy] Successfully fetched data from: <url>
 *   [API Proxy] Proxy error: <message>
 */

// =============================================================================
// 9. BEST PRACTICES
// =============================================================================

/**
 * For Developers:
 * 
 * 1. Always import ApiError type for error handling:
 *    const error = queryResult.error as ApiError;
 *    if (error?.isRetryable) { ... }
 * 
 * 2. Use provided recovery strategies:
 *    Don't manually retry - let the hook handle it
 *    Use rateLimitInfo to show user-friendly messages
 * 
 * 3. Configure appropriate refresh intervals:
 *    High-volume APIs: 5-10 minutes
 *    Low-volume APIs: 1 minute or less
 * 
 * 4. Handle cache fallback gracefully:
 *    Show indicator when using cached data
 *    Provide option to retry (via Retry button)
 * 
 * 5. Log errors for monitoring:
 *    Check console for recovery attempts
 *    Monitor "Retry Exhausted" messages
 * 
 * For Widget Configuration:
 * 
 * 1. Set API URL to exact, valid endpoints
 *    → Prevents INVALID_URL errors
 * 
 * 2. Include API keys in headers, not URL
 *    → More secure, easier to manage
 * 
 * 3. Test API before saving widget
 *    → Catches config errors early
 * 
 * 4. Use appropriate refresh intervals
 *    → Respect API rate limits
 *    → Balance freshness vs. efficiency
 */

// =============================================================================
// 10. FUTURE ENHANCEMENTS
// =============================================================================

/**
 * Possible Improvements:
 * 
 * 1. Persistent Rate Limit Storage:
 *    Replace localStorage with IndexedDB for large datasets
 * 
 * 2. Redis Integration:
 *    Move server-side rate limiting to Redis for multi-instance support
 * 
 * 3. Advanced Analytics:
 *    Track error patterns, success rates, avg retry count
 * 
 * 4. Adaptive Rate Limiting:
 *    Automatically adjust limits based on API response patterns
 * 
 * 5. Circuit Breaker Pattern:
 *    Stop requesting failed APIs temporarily
 * 
 * 6. Notification System:
 *    Alert user when APIs are consistently failing
 * 
 * 7. Request Queuing:
 *    Queue requests during rate limit windows
 * 
 * 8. API Health Monitoring:
 *    Track uptime and reliability per API
 */
