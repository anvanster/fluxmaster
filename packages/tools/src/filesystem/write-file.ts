import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  path: z.string().describe('Absolute or relative path to write the file'),
  content: z.string().describe('Content to write to the file'),
});

export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file at the given path. Creates the file if it does not exist, overwrites if it does.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { path: filePath, content } = inputSchema.parse(args);
    const absolutePath = path.resolve(filePath);

    try {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, content, 'utf-8');
      return { content: `Successfully wrote ${content.length} bytes to ${absolutePath}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: `Error writing file: ${message}`, isError: true };
    }
  },
};
