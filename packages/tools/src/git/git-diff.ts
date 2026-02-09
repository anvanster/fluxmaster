import { exec } from 'node:child_process';
import * as nodePath from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  path: z.string().optional().describe('Repository directory (defaults to cwd)'),
  staged: z.boolean().optional().default(false).describe('Show staged changes instead of unstaged'),
  ref: z.string().optional().describe('Compare against a ref (e.g., "HEAD~1", "main")'),
  files: z.array(z.string()).optional().describe('Specific files to diff'),
});

export const gitDiffTool: Tool = {
  name: 'git_diff',
  description: 'Show git diff output. Can show staged changes, compare against refs, or diff specific files.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { path: repoPath, staged, ref, files } = inputSchema.parse(args);
    const cwd = nodePath.resolve(repoPath ?? process.cwd());

    const parts = ['git', 'diff'];
    if (staged) parts.push('--staged');
    if (ref) parts.push(ref);
    if (files?.length) {
      parts.push('--');
      parts.push(...files);
    }

    return new Promise((resolve) => {
      exec(parts.join(' '), { cwd, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ content: stderr || error.message, isError: true });
          return;
        }
        resolve({ content: stdout.trim() || '(no changes)' });
      });
    });
  },
};
