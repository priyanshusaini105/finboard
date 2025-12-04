import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/utils/logger";

/**
 * Server-side Rate Limiting for API Proxy
 * Prevents overwhelming external APIs and protects against abuse
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limiting store (resets on server restart)
// For production, use Redis or similar persistent store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_CONFIG = {
  DEFAULT_REQUESTS_PER_MINUTE: 60,
  DEFAULT_REQUESTS_PER_HOUR: 1000,
  CLEANUP_INTERVAL: 60000, // Clean old entries every minute
};

// Start cleanup interval
if (typeof global !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  };

  if (!("finboardCleanupInterval" in global)) {
    (global as Record<string, unknown>).finboardCleanupInterval = setInterval(
      cleanup,
      RATE_LIMIT_CONFIG.CLEANUP_INTERVAL
    );
  }
}

/**
 * Check rate limit for a given key
 * Returns true if request is allowed, false if rate limited
 */
function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count < limit) {
    entry.count++;
    return true;
  }

  return false;
}

/**
 * Get rate limit status
 */
function getRateLimitStatus(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  return {
    allowed: entry.count < limit,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Extract meaningful error message from API response
 */
function extractErrorMessage(data: unknown): string {
  if (typeof data === "string") return data;

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;

    // Check common error fields
    if (obj.error) {
      if (typeof obj.error === "string") return obj.error;
      if (
        typeof obj.error === "object" &&
        "message" in (obj.error as Record<string, unknown>)
      ) {
        return String((obj.error as Record<string, unknown>).message);
      }
    }

    if (obj.message && typeof obj.message === "string") return obj.message;
    if (obj.reason && typeof obj.reason === "string") return obj.reason;
  }

  return "Unknown error";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");

    // Validate URL parameter
    if (!targetUrl) {
      return NextResponse.json(
        {
          error: "URL parameter is required",
          category: "MISSING_URL",
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid URL format",
          category: "INVALID_URL",
        },
        { status: 400 }
      );
    }

    // Extract domain for rate limiting
    const urlObj = new URL(targetUrl);
    const domain = urlObj.hostname;
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = `${clientIp}:${domain}`;

    // Check rate limits (60 per minute per domain)
    if (!checkRateLimit(rateLimitKey, 60, 60000)) {
      const status = getRateLimitStatus(rateLimitKey, 60, 60000);
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          category: "TOO_MANY_REQUESTS",
          retryAfter: Math.ceil((status.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((status.resetTime - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Get headers from the request
    const headers: Record<string, string> = {};

    // Copy relevant headers from the original request
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const apiKeyHeader = request.headers.get("x-api-key");
    if (apiKeyHeader) {
      headers["X-Api-Key"] = apiKeyHeader;
    }

    logger.info(`Proxying request to: ${targetUrl}`, { 
      hasApiKey: !!apiKeyHeader,
      headers: Object.keys(headers)
    });
    logger.debug(`Rate limit status for ${rateLimitKey}`, getRateLimitStatus(rateLimitKey, 60, 60000));

    // Make the API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "FinBoard/1.0",
          Accept: "application/json",
          ...headers,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle non-2xx responses
    if (!response.ok) {
      let errorData: unknown;
      const contentType = response.headers.get("content-type");

      try {
        if (contentType?.includes("application/json")) {
          errorData = await response.json();
        } else {
          errorData = await response.text();
        }
      } catch {
        errorData = null;
      }

      const errorMessage = extractErrorMessage(errorData);

      // Check for rate limiting from upstream API
      if (response.status === 429) {
        const retryAfter =
          response.headers.get("retry-after") || "60";
        logger.warn(`Rate limited by upstream API: ${targetUrl}`, { retryAfter });
        return NextResponse.json(
          {
            error: errorMessage || "Rate limited by upstream API",
            category: "TOO_MANY_REQUESTS",
            retryAfter: parseInt(retryAfter, 10) || 60,
          },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter,
            },
          }
        );
      }

      logger.error(`API request failed: ${response.status} ${response.statusText}`, { url: targetUrl, error: errorMessage });

      return NextResponse.json(
        {
          error: errorMessage || `HTTP ${response.status}: ${response.statusText}`,
          category:
            response.status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    // Parse response
    let data: unknown;
    const contentType = response.headers.get("content-type");

    try {
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (parseError) {
      logger.error(`Failed to parse response: ${(parseError as Error).message}`);
      return NextResponse.json(
        {
          error: "Failed to parse API response",
          category: "PARSING_ERROR",
        },
        { status: 502 }
      );
    }

    // Check for API-level errors in successful responses
    if (
      typeof data === "object" &&
      data !== null &&
      ("error" in (data as Record<string, unknown>) ||
        "Error" in (data as Record<string, unknown>))
    ) {
      const errorMsg = extractErrorMessage(data);
      logger.warn(`API returned error in successful response`, { url: targetUrl, error: errorMsg });
    }

    logger.info(`Successfully fetched data from: ${targetUrl}`, { size: JSON.stringify(data).length });

    const rateLimitStatus = getRateLimitStatus(rateLimitKey, 60, 60000);

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Api-Key",
        "X-RateLimit-Limit": "60",
        "X-RateLimit-Remaining": String(rateLimitStatus.remaining),
        "X-RateLimit-Reset": String(
          Math.ceil(rateLimitStatus.resetTime / 1000)
        ),
      },
    });
  } catch (error) {
    const errorMsg = (error as Error).message || "Unknown error";

    // Check for specific error types
    let category = "UNKNOWN";
    let statusCode = 500;

    if (errorMsg.includes("abort")) {
      category = "TIMEOUT";
      statusCode = 504;
    } else if (errorMsg.includes("network")) {
      category = "NETWORK_ERROR";
      statusCode = 502;
    }

    logger.error(`Proxy error: ${errorMsg}`, { error });

    return NextResponse.json(
      {
        error: `Failed to fetch data: ${errorMsg}`,
        category,
      },
      { status: statusCode }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Api-Key",
    },
  });
}
