import { describe, it, expect } from 'vitest';
import { isRetryableError } from './errors.js';

describe('isRetryableError', () => {
  it('returns true for rate limit errors', () => {
    expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true);
    expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true);
  });

  it('returns true for timeout errors', () => {
    expect(isRetryableError(new Error('Request timeout'))).toBe(true);
    expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('returns true for network errors', () => {
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
    expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true);
    expect(isRetryableError(new Error('network error'))).toBe(true);
  });

  it('returns true for 5xx server errors', () => {
    expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(true);
    expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
    expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
  });

  it('returns false for non-retryable errors', () => {
    expect(isRetryableError(new Error('400 Bad Request'))).toBe(false);
    expect(isRetryableError(new Error('401 Unauthorized'))).toBe(false);
    expect(isRetryableError(new Error('Invalid JSON'))).toBe(false);
    expect(isRetryableError(new Error('Missing required field'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isRetryableError('string error')).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});
