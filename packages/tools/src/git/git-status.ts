import { exec } from 'node:child_process';
import * as nodePath from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  path: z.string().optional().describe('Repository directory (defaults to cwd)'),
});

export const gitStatusTool: Tool = {
  name: 'git_status',
  description: 'Show git working tree status. Returns parsed lists of modified, staged, and untracked files.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { path: repoPath } = inputSchema.parse(args);
    const cwd = nodePath.resolve(repoPath ?? process.cwd());

    return new Promise((resolve) => {
      exec('git status --porcelain=v1', { cwd }, (error, stdout, stderr) => {
        if (error) {
          resolve({ content: stderr || error.message, isError: true });
          return;
        }

        const modified: string[] = [];
        const staged: string[] = [];
        const untracked: string[] = [];

        for (const line of stdout.split('\n').filter(Boolean)) {
          const indexStatus = line[0];
          const workStatus = line[1];
          const file = line.slice(3);

          if (indexStatus === '?') {
            untracked.push(file);
          } else {
            if (indexStatus !== ' ' && indexStatus !== '?') {
              staged.push(file);
            }
            if (workStatus === 'M' || workStatus === 'D') {
              modified.push(file);
            }
          }
        }

        resolve({ content: JSON.stringify({ modified, staged, untracked }, null, 2) });
      });
    });
  },
};
