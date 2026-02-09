import { exec } from 'node:child_process';
import * as nodePath from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  action: z.enum(['list', 'create', 'switch', 'delete']).describe('Branch operation to perform'),
  name: z.string().optional().describe('Branch name (required for create, switch, delete)'),
  path: z.string().optional().describe('Repository directory (defaults to cwd)'),
});

const COMMANDS: Record<string, (name: string) => string> = {
  list: () => 'git branch -a',
  create: (name) => `git checkout -b ${name}`,
  switch: (name) => `git checkout ${name}`,
  delete: (name) => `git branch -d ${name}`,
};

export const gitBranchTool: Tool = {
  name: 'git_branch',
  description: 'Manage git branches. List all branches, create new ones, switch between them, or delete them.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { action, name, path: repoPath } = inputSchema.parse(args);
    const cwd = nodePath.resolve(repoPath ?? process.cwd());

    if (action !== 'list' && !name) {
      return { content: `Branch name is required for action '${action}'`, isError: true };
    }

    const command = COMMANDS[action](name ?? '');

    return new Promise((resolve) => {
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          resolve({ content: stderr || error.message, isError: true });
          return;
        }
        resolve({ content: stdout.trim() || `Branch operation '${action}' completed` });
      });
    });
  },
};
