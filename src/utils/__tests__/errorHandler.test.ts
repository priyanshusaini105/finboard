/**
 * Minimal tests for errorHandler utility
 */

import { ErrorCategory, createApiError } from '../errorHandler';

describe('errorHandler', () => {
  it('should create ApiError with correct category from status code', () => {
    const error = createApiError('Request timeout', {
      statusCode: 408,
      statusText: 'Request Timeout',
    });

    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Request timeout');
    expect(error.statusCode).toBe(408);
    expect(error.category).toBeDefined();
    expect(error.recoveryStrategy).toBeDefined();
  });

  it('should mark 429 errors as retryable', () => {
    const rateLimitError = createApiError('Too many requests', {
      statusCode: 429,
      retryAfter: 60,
    });

    expect(rateLimitError.isRetryable).toBe(true);
    expect(rateLimitError.category).toBe(ErrorCategory.TOO_MANY_REQUESTS);
  });

  it('should mark 401 errors as non-retryable', () => {
    const authError = createApiError('Unauthorized', {
      statusCode: 401,
    });

    expect(authError.isRetryable).toBe(false);
    expect(authError.category).toBe(ErrorCategory.UNAUTHORIZED);
  });

  it('should handle errors with metadata', () => {
    const error = createApiError('Server error', {
      statusCode: 500,
      statusText: 'Internal Server Error',
      context: { endpoint: '/api/data' },
    });

    expect(error.metadata).toBeDefined();
    expect(error.metadata.context).toEqual({ endpoint: '/api/data' });
  });
});
