import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateBody } from './validation.js';

const TestSchema = z.object({
  name: z.string().min(1),
  value: z.number().positive(),
});

describe('validateBody', () => {
  it('returns success with valid data', () => {
    const result = validateBody(TestSchema, { name: 'test', value: 42 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'test', value: 42 });
    }
  });

  it('returns error for missing required fields', () => {
    const result = validateBody(TestSchema, { name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it('returns error for wrong types', () => {
    const result = validateBody(TestSchema, { name: 'test', value: -1 });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = validateBody(TestSchema, { name: 'test', value: 1, extra: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'test', value: 1 });
    }
  });
});
