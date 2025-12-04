/**
 * Unit tests for error handling and rate limiting logic
 */

describe('Error Handling Logic', () => {
  type ErrorCategory = 'NETWORK' | 'RATE_LIMIT' | 'INVALID_INPUT' | 'SERVER' | 'UNKNOWN';
  type RecoveryStrategy = 'RETRY_BACKOFF' | 'RETRY_IMMEDIATE' | 'USE_CACHE' | 'FAIL' | 'DEGRADE';

  interface ErrorClassification {
    category: ErrorCategory;
    strategy: RecoveryStrategy;
    isRetryable: boolean;
    message: string;
  }

  describe('categorizeError', () => {
    const categorizeError = (statusCode: number, message: string): ErrorClassification => {
      const lowerMessage = message.toLowerCase();

      // Rate limit errors
      if (statusCode === 429 || lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
        return {
          category: 'RATE_LIMIT',
          strategy: 'RETRY_BACKOFF',
          isRetryable: true,
          message: 'Rate limit exceeded, will retry with backoff',
        };
      }

      // Invalid input errors (before server errors)
      if (
        statusCode === 400 ||
        statusCode === 422 ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('bad request')
      ) {
        return {
          category: 'INVALID_INPUT',
          strategy: 'FAIL',
          isRetryable: false,
          message: 'Invalid input, cannot retry',
        };
      }

      // Server errors (5xx)
      if (statusCode >= 500) {
        return {
          category: 'SERVER',
          strategy: 'RETRY_BACKOFF',
          isRetryable: true,
          message: 'Server error, will retry',
        };
      }

      // Network errors
      if (
        statusCode === 0 ||
        lowerMessage.includes('network') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('econnrefused')
      ) {
        return {
          category: 'NETWORK',
          strategy: 'RETRY_BACKOFF',
          isRetryable: true,
          message: 'Network error, will retry',
        };
      }

      // Unknown errors
      return {
        category: 'UNKNOWN',
        strategy: 'FAIL',
        isRetryable: false,
        message: 'Unknown error',
      };
    };

    it('should classify rate limit errors correctly', () => {
      const result1 = categorizeError(429, 'Too Many Requests');
      expect(result1.category).toBe('RATE_LIMIT');
      expect(result1.strategy).toBe('RETRY_BACKOFF');
      expect(result1.isRetryable).toBe(true);

      const result2 = categorizeError(200, 'Rate limit exceeded');
      expect(result2.category).toBe('RATE_LIMIT');
      expect(result2.strategy).toBe('RETRY_BACKOFF');
    });

    it('should classify network errors correctly', () => {
      const result1 = categorizeError(0, 'Network timeout');
      expect(result1.category).toBe('NETWORK');
      expect(result1.isRetryable).toBe(true);

      const result2 = categorizeError(503, 'Service unavailable');
      expect(result2.category).toBe('SERVER');
      expect(result2.strategy).toBe('RETRY_BACKOFF');

      const result3 = categorizeError(200, 'ECONNREFUSED');
      expect(result3.category).toBe('NETWORK');
    });

    it('should classify invalid input errors correctly', () => {
      const result1 = categorizeError(400, 'Bad request');
      expect(result1.category).toBe('INVALID_INPUT');
      expect(result1.isRetryable).toBe(false);
      expect(result1.strategy).toBe('FAIL');

      const result2 = categorizeError(422, 'Invalid input');
      expect(result2.category).toBe('INVALID_INPUT');
      expect(result2.isRetryable).toBe(false);
    });

    it('should classify server errors correctly', () => {
      const result = categorizeError(500, 'Internal server error');
      expect(result.category).toBe('SERVER');
      expect(result.isRetryable).toBe(true);
      expect(result.strategy).toBe('RETRY_BACKOFF');
    });

    it('should classify unknown errors correctly', () => {
      const result = categorizeError(418, 'Im a teapot');
      expect(result.category).toBe('UNKNOWN');
      expect(result.isRetryable).toBe(false);
    });
  });

  describe('determineRetryStrategy', () => {
    interface RetryStrategy {
      shouldRetry: boolean;
      delayMs: number;
      maxAttempts: number;
      backoffMultiplier: number;
    }

    const determineRetryStrategy = (category: ErrorCategory, attempt: number): RetryStrategy => {
      switch (category) {
        case 'RATE_LIMIT':
          return {
            shouldRetry: attempt < 5,
            delayMs: Math.min(1000 * Math.pow(2, attempt), 32000), // Exponential backoff capped at 32s
            maxAttempts: 5,
            backoffMultiplier: 2,
          };

        case 'NETWORK':
          return {
            shouldRetry: attempt < 3,
            delayMs: 1000 * (attempt + 1), // Linear backoff
            maxAttempts: 3,
            backoffMultiplier: 1,
          };

        case 'INVALID_INPUT':
        case 'UNKNOWN':
          return {
            shouldRetry: false,
            delayMs: 0,
            maxAttempts: 1,
            backoffMultiplier: 1,
          };

        default:
          return {
            shouldRetry: false,
            delayMs: 0,
            maxAttempts: 1,
            backoffMultiplier: 1,
          };
      }
    };

    it('should return exponential backoff for rate limit errors', () => {
      const s0 = determineRetryStrategy('RATE_LIMIT', 0);
      const s1 = determineRetryStrategy('RATE_LIMIT', 1);
      const s2 = determineRetryStrategy('RATE_LIMIT', 2);

      expect(s0.delayMs).toBe(1000); // 2^0 * 1000
      expect(s1.delayMs).toBe(2000); // 2^1 * 1000
      expect(s2.delayMs).toBe(4000); // 2^2 * 1000
      expect(s0.shouldRetry).toBe(true);
      expect(s0.maxAttempts).toBe(5);
    });

    it('should cap exponential backoff at maximum', () => {
      const s5 = determineRetryStrategy('RATE_LIMIT', 5);
      expect(s5.delayMs).toBeLessThanOrEqual(32000);
      expect(s5.shouldRetry).toBe(false); // Max attempts reached
    });

    it('should return linear backoff for network errors', () => {
      const s0 = determineRetryStrategy('NETWORK', 0);
      const s1 = determineRetryStrategy('NETWORK', 1);
      const s2 = determineRetryStrategy('NETWORK', 2);

      expect(s0.delayMs).toBe(1000);
      expect(s1.delayMs).toBe(2000);
      expect(s2.delayMs).toBe(3000);
    });

    it('should stop retrying network errors after max attempts', () => {
      const s3 = determineRetryStrategy('NETWORK', 3);
      expect(s3.shouldRetry).toBe(false);
    });

    it('should not retry invalid input errors', () => {
      const result = determineRetryStrategy('INVALID_INPUT', 0);
      expect(result.shouldRetry).toBe(false);
      expect(result.delayMs).toBe(0);
      expect(result.maxAttempts).toBe(1);
    });

    it('should not retry unknown errors', () => {
      const result = determineRetryStrategy('UNKNOWN', 0);
      expect(result.shouldRetry).toBe(false);
      expect(result.maxAttempts).toBe(1);
    });
  });

  describe('shouldUseCacheFallback', () => {
    const shouldUseCacheFallback = (category: ErrorCategory, hasCachedData: boolean): boolean => {
      // Use cache for transient errors when data exists
      const transientErrors: ErrorCategory[] = ['NETWORK', 'RATE_LIMIT', 'SERVER'];
      return transientErrors.includes(category) && hasCachedData;
    };

    it('should use cache for transient errors when data exists', () => {
      expect(shouldUseCacheFallback('NETWORK', true)).toBe(true);
      expect(shouldUseCacheFallback('RATE_LIMIT', true)).toBe(true);
      expect(shouldUseCacheFallback('SERVER', true)).toBe(true);
    });

    it('should not use cache when no data exists', () => {
      expect(shouldUseCacheFallback('NETWORK', false)).toBe(false);
      expect(shouldUseCacheFallback('RATE_LIMIT', false)).toBe(false);
    });

    it('should not use cache for permanent errors', () => {
      expect(shouldUseCacheFallback('INVALID_INPUT', true)).toBe(false);
      expect(shouldUseCacheFallback('UNKNOWN', true)).toBe(false);
    });
  });
});

describe('Rate Limiting Logic', () => {
  describe('TokenBucket', () => {
    interface TokenBucket {
      tokens: number;
      capacity: number;
      refillRate: number;
      lastRefillTime: number;
    }

    const createBucket = (capacity: number, refillRate: number): TokenBucket => ({
      tokens: capacity,
      capacity,
      refillRate,
      lastRefillTime: Date.now(),
    });

    const refillTokens = (bucket: TokenBucket, now: number): void => {
      const elapsedSeconds = (now - bucket.lastRefillTime) / 1000;
      const tokensToAdd = elapsedSeconds * bucket.refillRate;
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefillTime = now;
    };

    const tryConsumeTokens = (bucket: TokenBucket, count: number, now: number): boolean => {
      refillTokens(bucket, now);
      if (bucket.tokens >= count) {
        bucket.tokens -= count;
        return true;
      }
      return false;
    };

    it('should allow requests within capacity', () => {
      const bucket = createBucket(10, 5); // 10 tokens, 5 per second
      const now = Date.now();

      expect(tryConsumeTokens(bucket, 3, now)).toBe(true);
      expect(tryConsumeTokens(bucket, 5, now)).toBe(true);
      expect(tryConsumeTokens(bucket, 3, now)).toBe(false); // Only 2 left
    });

    it('should refill tokens over time', () => {
      const bucket = createBucket(10, 5); // 5 tokens per second
      const now = Date.now();

      // Consume all tokens
      expect(tryConsumeTokens(bucket, 10, now)).toBe(true);
      expect(bucket.tokens).toBe(0);

      // Wait 2 seconds
      const later = now + 2000;
      expect(tryConsumeTokens(bucket, 1, later)).toBe(true); // Should have 10 tokens (5 * 2s)
      expect(bucket.tokens).toBe(9);
    });

    it('should not exceed capacity after refill', () => {
      const bucket = createBucket(10, 5);
      const now = Date.now();

      // Start with 5 tokens
      bucket.tokens = 5;

      // Wait 2 seconds (should add 10 tokens, but capped at capacity)
      const later = now + 2000;
      refillTokens(bucket, later);

      expect(bucket.tokens).toBe(10); // Capped at capacity
    });

    it('should handle high refill rates', () => {
      const bucket = createBucket(100, 50); // 50 tokens per second
      const now = Date.now();

      // Consume all tokens
      expect(tryConsumeTokens(bucket, 100, now)).toBe(true);
      expect(bucket.tokens).toBe(0);

      // Wait 0.5 seconds
      const later = now + 500;
      expect(tryConsumeTokens(bucket, 25, later)).toBe(true); // Should have ~25 tokens
      expect(bucket.tokens).toBeGreaterThanOrEqual(0);
    });

    it('should handle fractional token calculations', () => {
      const bucket = createBucket(10, 3); // 3 tokens per second
      const now = Date.now();

      bucket.tokens = 0;

      // Wait 0.5 seconds (should have 1.5 tokens)
      const later = now + 500;
      expect(tryConsumeTokens(bucket, 1, later)).toBe(true);
      expect(bucket.tokens).toBeCloseTo(0.5, 1);
    });

    it('should support burst requests', () => {
      const bucket = createBucket(100, 10); // 100 capacity, 10 per second
      const now = Date.now();

      // Full burst at start
      expect(tryConsumeTokens(bucket, 100, now)).toBe(true);
      expect(bucket.tokens).toBe(0);

      // Cannot request more until refilled
      expect(tryConsumeTokens(bucket, 1, now)).toBe(false);

      // Wait for partial refill
      const later = now + 500;
      expect(tryConsumeTokens(bucket, 1, later)).toBe(true); // 10 * 0.5 = 5 tokens
    });
  });

  describe('RateLimiter', () => {
    interface RateLimitConfig {
      requestsPerSecond: number;
      burstSize: number;
      windowSize: number;
    }

    const createRateLimiter = (config: RateLimitConfig) => {
      let bucket = createBucketHelper(config.burstSize, config.requestsPerSecond);

      const isAllowed = (now: number): boolean => {
        refillTokensHelper(bucket, now);
        if (bucket.tokens >= 1) {
          bucket.tokens -= 1;
          return true;
        }
        return false;
      };

      const getNextAvailableTime = (now: number): number => {
        const tokensNeeded = 1;
        const timeToRefill = (tokensNeeded - bucket.tokens) / config.requestsPerSecond;
        return Math.max(0, Math.ceil(timeToRefill * 1000));
      };

      return { isAllowed, getNextAvailableTime };
    };

    const createBucketHelper = (capacity: number, rate: number) => ({
      tokens: capacity,
      capacity,
      refillRate: rate,
      lastRefillTime: Date.now(),
    });

    const refillTokensHelper = (bucket: any, now: number) => {
      const elapsed = (now - bucket.lastRefillTime) / 1000;
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsed * bucket.refillRate);
      bucket.lastRefillTime = now;
    };

    it('should allow requests up to rate limit', () => {
      const limiter = createRateLimiter({
        requestsPerSecond: 5,
        burstSize: 5,
        windowSize: 1000,
      });

      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        expect(limiter.isAllowed(now)).toBe(true);
      }
      expect(limiter.isAllowed(now)).toBe(false);
    });

    it('should report wait time when rate limited', () => {
      const limiter = createRateLimiter({
        requestsPerSecond: 5,
        burstSize: 5,
        windowSize: 1000,
      });

      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(now);
      }

      const waitTime = limiter.getNextAvailableTime(now);
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(1000 / 5); // ~200ms for 5 requests/sec
    });
  });
});
