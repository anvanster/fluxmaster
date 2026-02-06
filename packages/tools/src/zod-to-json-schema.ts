import type { z } from 'zod';

/**
 * Lightweight Zod-to-JSON-Schema converter for tool definitions.
 * Handles the common cases needed for tool input schemas.
 */
export function zodToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  // Zod schemas have a `_def` property with type info
  const def = (schema as any)._def;

  if (!def) {
    return { type: 'object', properties: {} };
  }

  switch (def.typeName) {
    case 'ZodObject': {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value as z.ZodType<unknown>);
        // Check if field is optional
        if ((value as any)._def.typeName !== 'ZodOptional' &&
            (value as any)._def.typeName !== 'ZodDefault') {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }
    case 'ZodString':
      return {
        type: 'string',
        ...(def.description ? { description: def.description } : {}),
      };
    case 'ZodNumber':
      return {
        type: 'number',
        ...(def.description ? { description: def.description } : {}),
      };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchema(def.type),
      };
    case 'ZodOptional':
      return zodToJsonSchema(def.innerType);
    case 'ZodDefault':
      return zodToJsonSchema(def.innerType);
    case 'ZodEnum':
      return {
        type: 'string',
        enum: def.values,
      };
    default:
      return { type: 'string' };
  }
}
