import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  pattern: z.string().describe('Regex pattern to search for'),
  path: z.string().optional().describe('Directory to search in (defaults to cwd)'),
  filePattern: z.string().optional().describe('File extension filter like "*.ts"'),
  contextLines: z.number().int().nonnegative().optional().default(0).describe('Number of context lines before and after match'),
  maxResults: z.number().int().positive().optional().default(50).describe('Maximum number of results'),
});

interface SearchMatch {
  file: string;
  lineNumber: number;
  line: string;
  context: { before: string[]; after: string[] };
}

function matchesFilePattern(filePath: string, pattern: string): boolean {
  // Handle *.ext patterns
  if (pattern.startsWith('*.')) {
    return filePath.endsWith(pattern.slice(1));
  }
  return filePath.includes(pattern);
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

export const searchTextTool: Tool = {
  name: 'search_text',
  description: 'Search for a regex pattern across files in a directory. Returns matching lines with file paths and line numbers.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { pattern, path: searchPath, filePattern, contextLines, maxResults } = inputSchema.parse(args);

    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch {
      return { content: `Invalid regex pattern: ${pattern}`, isError: true };
    }

    const dir = path.resolve(searchPath ?? process.cwd());

    let files: string[];
    try {
      files = await walkDir(dir);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: `Error reading directory: ${message}`, isError: true };
    }

    if (filePattern) {
      files = files.filter((f) => matchesFilePattern(f, filePattern));
    }

    const matches: SearchMatch[] = [];

    for (const file of files) {
      if (matches.length >= maxResults) break;

      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= maxResults) break;
          if (regex.test(lines[i])) {
            const before = lines.slice(Math.max(0, i - contextLines), i);
            const after = lines.slice(i + 1, i + 1 + contextLines);
            matches.push({
              file,
              lineNumber: i + 1,
              line: lines[i],
              context: { before, after },
            });
          }
        }
      } catch {
        // Skip binary files or unreadable files
      }
    }

    if (matches.length === 0) {
      return { content: 'No matches found' };
    }

    return { content: JSON.stringify(matches, null, 2) };
  },
};
