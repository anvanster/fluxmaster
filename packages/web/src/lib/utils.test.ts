import { describe, it, expect } from 'vitest';
import { cn, formatTokens, formatDate, formatCost } from './utils';

describe('cn', () => {
  it('joins classes', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });
});

describe('formatTokens', () => {
  it('formats small numbers', () => {
    expect(formatTokens(500)).toBe('500');
  });

  it('formats thousands', () => {
    expect(formatTokens(1500)).toBe('1.5K');
  });

  it('formats millions', () => {
    expect(formatTokens(2_500_000)).toBe('2.5M');
  });
});

describe('formatDate', () => {
  it('formats a date string to time', () => {
    const result = formatDate('2025-01-15T14:30:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatCost', () => {
  it('formats dollar amounts to 2 decimal places', () => {
    expect(formatCost(7.5)).toBe('$7.50');
    expect(formatCost(0.75)).toBe('$0.75');
  });

  it('shows <$0.01 for tiny amounts', () => {
    expect(formatCost(0.001)).toBe('<$0.01');
    expect(formatCost(0)).toBe('<$0.01');
  });
});
