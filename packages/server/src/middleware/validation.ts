import { z } from 'zod';

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string;
  issues: z.ZodIssue[];
}

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): ValidationResult<T> | ValidationError {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: 'Validation failed',
    issues: result.error.issues,
  };
}
