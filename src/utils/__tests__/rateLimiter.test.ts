/**
 * Minimal tests for rateLimiter utility
 */

import { RateLimiter } from '../rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should allow requests within limit', () => {
    const limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      storageKey: 'test1',
    });

    const result = limiter.checkLimit();
    expect(result.allowed).toBe(true);
    expect(result.tokensRemaining).toBeLessThan(3);
  });

  it('should block requests when limit exceeded', () => {
    const limiter = new RateLimiter({
      maxRequests: 1,
      windowMs: 1000,
      storageKey: 'test2',
    });

    limiter.checkLimit(); // Use the only token
    const result = limiter.checkLimit(); // Should be blocked
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should reset limit correctly', () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000,
      storageKey: 'test3',
    });

    limiter.checkLimit();
    limiter.checkLimit(); // Exhaust tokens
    
    limiter.reset(); // Reset limiter
    
    const result = limiter.checkLimit();
    expect(result.allowed).toBe(true);
  });
});
