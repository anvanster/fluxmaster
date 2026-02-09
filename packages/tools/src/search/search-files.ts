import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g., "*.ts", "**/*.test.ts")'),
  path: z.string().optional().describe('Root directory to search in (defaults to cwd)'),
});

function globToRegex(glob: string): RegExp {
  let pattern = glob
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');

  // If no path separator in pattern, match just the filename
  if (!glob.includes('/')) {
    pattern = `(^|/)${pattern}$`;
  } else {
    pattern = `${pattern}$`;
  }

  return new RegExp(pattern);
}

async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      files.push(...await walkDir(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export const searchFilesTool: Tool = {
  name: 'search_files',
  description: 'Find files matching a glob pattern. Supports *, **, and ? wildcards. Returns matching file paths.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { pattern, path: searchPath } = inputSchema.parse(args);
    const dir = path.resolve(searchPath ?? process.cwd());

    let allFiles: string[];
    try {
      allFiles = await walkDir(dir);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: `Error reading directory: ${message}`, isError: true };
    }

    const regex = globToRegex(pattern);
    const relative = allFiles
      .map((f) => path.relative(dir, f))
      .filter((f) => regex.test(f));

    if (relative.length === 0) {
      return { content: 'No files found' };
    }

    return { content: relative.join('\n') };
  },
};
