import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';

const inputSchema = z.object({
  path: z.string().describe('Path to the file to edit'),
  old_text: z.string().min(1).describe('Exact text to find (must appear exactly once)'),
  new_text: z.string().describe('Replacement text (empty string to delete)'),
});

export const editFileTool: Tool = {
  name: 'edit_file',
  description: 'Edit a file by replacing an exact text match. The old_text must appear exactly once in the file for safety. Use this for targeted edits instead of rewriting entire files.',
  inputSchema,
  async execute(args: unknown): Promise<ToolResult> {
    const { path: filePath, old_text, new_text } = inputSchema.parse(args);
    const absolutePath = path.resolve(filePath);

    let content: string;
    try {
      content = await fs.readFile(absolutePath, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: `Error reading file: ${message}`, isError: true };
    }

    // Count occurrences
    let count = 0;
    let idx = 0;
    while ((idx = content.indexOf(old_text, idx)) !== -1) {
      count++;
      idx += old_text.length;
    }

    if (count === 0) {
      return { content: 'old_text not found in file', isError: true };
    }

    if (count > 1) {
      return { content: `old_text appears ${count} times in file; must be unique. Provide more surrounding context to make it unique.`, isError: true };
    }

    const updated = content.replace(old_text, new_text);
    await fs.writeFile(absolutePath, updated, 'utf-8');

    return { content: `Replaced text in ${filePath}` };
  },
};
