import { exec } from 'node:child_process';
import * as nodePath from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  message: z.string().min(1).describe('Commit message'),
  files: z.array(z.string()).optional().describe('Specific files to stage before committing'),
  all: z.boolean().optional().default(false).describe('Stage all tracked changes before committing'),
  path: z.string().optional().describe('Repository directory (defaults to cwd)'),
});

function execPromise(command: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

export const gitCommitTool: Tool = {
  name: 'git_commit',
  description: 'Stage files and create a git commit. Specify individual files or use all:true to stage everything.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { message, files, all, path: repoPath } = inputSchema.parse(args);
    const cwd = nodePath.resolve(repoPath ?? process.cwd());

    try {
      if (files?.length) {
        const fileArgs = files.map((f) => `"${f}"`).join(' ');
        await execPromise(`git add ${fileArgs}`, cwd);
      } else if (all) {
        await execPromise('git add -A', cwd);
      } else {
        return { content: 'Specify files to stage or set all: true', isError: true };
      }

      // Escape double quotes in commit message
      const escaped = message.replace(/"/g, '\\"');
      const output = await execPromise(`git commit -m "${escaped}"`, cwd);
      return { content: output.trim() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: msg, isError: true };
    }
  },
};
