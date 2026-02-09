import { exec } from 'node:child_process';
import * as nodePath from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  path: z.string().optional().describe('Repository directory (defaults to cwd)'),
  count: z.number().int().positive().optional().default(10).describe('Number of commits to show'),
  branch: z.string().optional().describe('Branch to show log for'),
  file: z.string().optional().describe('Show commits for a specific file'),
  format: z.enum(['oneline', 'short', 'full']).optional().default('oneline').describe('Output format'),
});

const FORMAT_MAP: Record<string, string> = {
  oneline: '--oneline',
  short: '--format=short',
  full: '--format=full',
};

export const gitLogTool: Tool = {
  name: 'git_log',
  description: 'Show git commit history. Supports limiting count, filtering by branch or file, and different output formats.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { path: repoPath, count, branch, file, format } = inputSchema.parse(args);
    const cwd = nodePath.resolve(repoPath ?? process.cwd());

    const parts = ['git', 'log', FORMAT_MAP[format], `-${count}`];
    if (branch) parts.push(branch);
    if (file) {
      parts.push('--');
      parts.push(file);
    }

    return new Promise((resolve) => {
      exec(parts.join(' '), { cwd }, (error, stdout, stderr) => {
        if (error) {
          resolve({ content: stderr || error.message, isError: true });
          return;
        }
        resolve({ content: stdout.trim() || '(no commits)' });
      });
    });
  },
};
