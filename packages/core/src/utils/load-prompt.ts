import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function resolvePrompt(
  value: string | undefined,
  basePath: string,
): Promise<string | undefined> {
  if (!value) return undefined;
  if (value.startsWith('file:')) {
    const filePath = path.resolve(basePath, value.slice(5));
    return fs.readFile(filePath, 'utf-8');
  }
  return value;
}
