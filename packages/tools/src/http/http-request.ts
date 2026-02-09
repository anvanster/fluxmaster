import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  url: z.string().url().describe('URL to send the request to'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).optional().default('GET').describe('HTTP method'),
  headers: z.record(z.string()).optional().describe('Request headers'),
  body: z.string().optional().describe('Request body'),
  timeout: z.number().int().positive().optional().default(30000).describe('Timeout in milliseconds'),
});

export const httpRequestTool: Tool = {
  name: 'http_request',
  description: 'Make an HTTP request. Returns status code, response headers, and body. Useful for testing APIs or fetching data.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { url, method, headers, body, timeout } = inputSchema.parse(args);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseBody = await response.text();

      return {
        content: JSON.stringify({
          status: response.status,
          headers: responseHeaders,
          body: responseBody,
        }, null, 2),
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { content: `Request timed out after ${timeout}ms`, isError: true };
      }
      const message = err instanceof Error ? err.message : String(err);
      return { content: `Request failed: ${message}`, isError: true };
    } finally {
      clearTimeout(timer);
    }
  },
};
