import { exec } from 'node:child_process';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  command: z.string().describe('Shell command to execute'),
  timeout: z.number().positive().optional().describe('Timeout in milliseconds (default: 30000)'),
});

export const bashExecuteTool: Tool = {
  name: 'bash_execute',
  description: 'Execute a shell command and return the output. Returns stdout on success, stderr on failure.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { command, timeout = 30000 } = inputSchema.parse(args);

    return new Promise((resolve) => {
      exec(command, { timeout }, (error, stdout, stderr) => {
        if (error) {
          const output = stderr || error.message;
          resolve({ content: `Exit code ${error.code ?? 1}: ${output}`, isError: true });
          return;
        }
        resolve({ content: stdout || '(no output)' });
      });
    });
  },
};
