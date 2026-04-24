import { describe, it, expect } from 'vitest';
import { classifyError, RetryableError, NonRetryableError } from './errors.js';

describe('Error Classification', () => {
  it('classifies timeout as retryable', () => {
    const result = classifyError(new Error('Connection timeout after 30s'));
    expect(result).toBeInstanceOf(RetryableError);
  });

  it('classifies ECONNREFUSED as retryable', () => {
    const result = classifyError(new Error('connect ECONNREFUSED 127.0.0.1:3000'));
    expect(result).toBeInstanceOf(RetryableError);
  });

  it('classifies 503 as retryable', () => {
    const result = classifyError(new Error('API error 503: Service unavailable'));
    expect(result).toBeInstanceOf(RetryableError);
  });

  it('classifies 401 as non-retryable', () => {
    const result = classifyError(new Error('API error 401: Unauthorized'));
    expect(result).toBeInstanceOf(NonRetryableError);
  });

  it('classifies invalid credentials as non-retryable', () => {
    const result = classifyError(new Error('Invalid credentials provided'));
    expect(result).toBeInstanceOf(NonRetryableError);
  });

  it('classifies decrypt error as non-retryable', () => {
    const result = classifyError(new Error('Failed to decrypt envelope'));
    expect(result).toBeInstanceOf(NonRetryableError);
  });

  it('passes through already-classified errors', () => {
    const retryable = new RetryableError('net error');
    expect(classifyError(retryable)).toBe(retryable);

    const nonRetryable = new NonRetryableError('auth error');
    expect(classifyError(nonRetryable)).toBe(nonRetryable);
  });

  it('defaults unknown errors to non-retryable (fail-safe)', () => {
    const result = classifyError(new Error('Something completely unexpected'));
    expect(result).toBeInstanceOf(NonRetryableError);
  });
});
