import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  path: z.string().describe('Directory path to list'),
});

export const listFilesTool: Tool = {
  name: 'list_files',
  description: 'List files and directories at the given path. Returns file names with type indicators (/ for directories).',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { path: dirPath } = inputSchema.parse(args);
    const absolutePath = path.resolve(dirPath);

    try {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      const listing = entries.map(entry => {
        const suffix = entry.isDirectory() ? '/' : '';
        return `${entry.name}${suffix}`;
      }).join('\n');

      return { content: listing || '(empty directory)' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: `Error listing directory: ${message}`, isError: true };
    }
  },
};
