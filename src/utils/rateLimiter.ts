/**
 * Rate Limiter Utility
 * Implements token bucket algorithm with persistent storage
 * Supports per-API and global rate limiting
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
  storageKey?: string;
}

export interface RateLimitStatus {
  allowed: boolean;
  tokensRemaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitData {
  tokens: number;
  lastRefill: number;
  requestCount: number;
}

/**
 * Token Bucket Rate Limiter
 * Uses localStorage for persistence across page reloads
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private storageKey: string;
  private data: RateLimitData;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      storageKey: config.storageKey || "rate_limit_default",
    };

    this.storageKey = `finboard:${this.config.storageKey}`;
    this.data = this.loadFromStorage();
  }

  /**
   * Load rate limit data from localStorage
   */
  private loadFromStorage(): RateLimitData {
    try {
      if (typeof window === "undefined") {
        return { tokens: this.config.maxRequests, lastRefill: Date.now(), requestCount: 0 };
      }

      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as RateLimitData;
        // Validate stored data
        if (
          typeof parsed.tokens === "number" &&
          typeof parsed.lastRefill === "number"
        ) {
          return parsed;
        }
      }
    } catch {
      console.warn(`Failed to load rate limit data from storage for ${this.storageKey}`);
    }

    return {
      tokens: this.config.maxRequests,
      lastRefill: Date.now(),
      requestCount: 0,
    };
  }

  /**
   * Save rate limit data to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      }
    } catch {
      console.warn(`Failed to save rate limit data to storage for ${this.storageKey}`);
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.data.lastRefill;

    if (elapsed >= this.config.windowMs) {
      // Full window passed, reset to max
      this.data.tokens = this.config.maxRequests;
      this.data.lastRefill = now;
      this.data.requestCount = 0;
    } else {
      // Partial refill based on time passed
      const refillRate = this.config.maxRequests / this.config.windowMs;
      const tokensToAdd = refillRate * elapsed;
      this.data.tokens = Math.min(
        this.config.maxRequests,
        this.data.tokens + tokensToAdd
      );
      this.data.lastRefill = now;
    }
  }

  /**
   * Check if a request is allowed and consume a token if so
   */
  public checkLimit(): RateLimitStatus {
    this.refillTokens();

    const now = Date.now();
    const timeUntilReset = this.config.windowMs - (now - this.data.lastRefill);

    if (this.data.tokens >= 1) {
      this.data.tokens -= 1;
      this.data.requestCount += 1;
      this.saveToStorage();

      return {
        allowed: true,
        tokensRemaining: Math.floor(this.data.tokens),
        resetTime: now + timeUntilReset,
      };
    }

    // Rate limit exceeded
    const retryAfter = Math.ceil(timeUntilReset / 1000);
    return {
      allowed: false,
      tokensRemaining: 0,
      resetTime: now + timeUntilReset,
      retryAfter,
    };
  }

  /**
   * Get current status without consuming a token
   */
  public getStatus(): RateLimitStatus {
    this.refillTokens();

    const now = Date.now();
    const timeUntilReset = this.config.windowMs - (now - this.data.lastRefill);

    return {
      allowed: this.data.tokens >= 1,
      tokensRemaining: Math.floor(this.data.tokens),
      resetTime: now + timeUntilReset,
    };
  }

  /**
   * Reset the rate limiter
   */
  public reset(): void {
    this.data = {
      tokens: this.config.maxRequests,
      lastRefill: Date.now(),
      requestCount: 0,
    };
    this.saveToStorage();
  }

  /**
   * Get metrics
   */
  public getMetrics() {
    return {
      tokensRemaining: Math.floor(this.data.tokens),
      maxTokens: this.config.maxRequests,
      windowMs: this.config.windowMs,
      requestCount: this.data.requestCount,
      lastRefill: this.data.lastRefill,
    };
  }
}

/**
 * Pre-configured rate limiters for common APIs
 */
export const RateLimiters = {
  // Alpha Vantage: 5 requests per minute
  alphaVantage: () =>
    new RateLimiter({
      maxRequests: 5,
      windowMs: 60 * 1000,
      storageKey: "rate_limit:alphavantage",
    }),

  // Finnhub: 60 requests per minute
  finnhub: () =>
    new RateLimiter({
      maxRequests: 60,
      windowMs: 60 * 1000,
      storageKey: "rate_limit:finnhub",
    }),

  // Generic API: 30 requests per minute
  generic: () =>
    new RateLimiter({
      maxRequests: 30,
      windowMs: 60 * 1000,
      storageKey: "rate_limit:generic",
    }),
};

/**
 * Get appropriate rate limiter for an API URL
 */
export function getRateLimiterForUrl(url: string): RateLimiter {
  if (url.includes("alphavantage")) {
    return RateLimiters.alphaVantage();
  } else if (url.includes("finnhub")) {
    return RateLimiters.finnhub();
  } else {
    return RateLimiters.generic();
  }
}

/**
 * Wait for rate limit to reset
 */
export async function waitForRateLimitReset(
  limiter: RateLimiter
): Promise<void> {
  const status = limiter.getStatus();
  if (status.allowed) return;

  const waitTime = status.retryAfter ? status.retryAfter * 1000 : 1000;
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}
