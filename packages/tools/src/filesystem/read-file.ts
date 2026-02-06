import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  path: z.string().describe('Absolute or relative path to the file to read'),
});

export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file at the given path. Returns the file content as a string.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { path: filePath } = inputSchema.parse(args);
    const absolutePath = path.resolve(filePath);

    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      return { content };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: `Error reading file: ${message}`, isError: true };
    }
  },
};
