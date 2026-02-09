import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { searchTextTool } from './search-text.js';

describe('search_text tool', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-text-'));
    await fs.writeFile(path.join(tmpDir, 'hello.ts'), 'const greeting = "hello world";\nconsole.log(greeting);\n');
    await fs.writeFile(path.join(tmpDir, 'math.ts'), 'function add(a: number, b: number) {\n  return a + b;\n}\nexport { add };\n');
    await fs.mkdir(path.join(tmpDir, 'sub'));
    await fs.writeFile(path.join(tmpDir, 'sub', 'nested.ts'), 'const hello = "nested hello";\n');
    await fs.writeFile(path.join(tmpDir, 'readme.md'), '# Hello\nThis is a readme.\n');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('has correct name and description', () => {
    expect(searchTextTool.name).toBe('search_text');
    expect(searchTextTool.description).toBeTruthy();
  });

  it('finds regex matches across files', async () => {
    const result = await searchTextTool.execute({ pattern: 'hello', path: tmpDir });
    expect(result.isError).toBeUndefined();
    const matches = JSON.parse(result.content);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches.some((m: { file: string }) => m.file.endsWith('hello.ts'))).toBe(true);
    expect(matches.some((m: { file: string }) => m.file.endsWith('nested.ts'))).toBe(true);
  });

  it('returns line numbers', async () => {
    const result = await searchTextTool.execute({ pattern: 'console\\.log', path: tmpDir });
    const matches = JSON.parse(result.content);
    expect(matches).toHaveLength(1);
    expect(matches[0].lineNumber).toBe(2);
    expect(matches[0].line).toContain('console.log');
  });

  it('respects filePattern filter', async () => {
    const result = await searchTextTool.execute({ pattern: 'hello', path: tmpDir, filePattern: '*.ts' });
    const matches = JSON.parse(result.content);
    expect(matches.every((m: { file: string }) => m.file.endsWith('.ts'))).toBe(true);
    expect(matches.some((m: { file: string }) => m.file.endsWith('readme.md'))).toBe(false);
  });

  it('includes context lines', async () => {
    const result = await searchTextTool.execute({ pattern: 'return a', path: tmpDir, contextLines: 1 });
    const matches = JSON.parse(result.content);
    expect(matches).toHaveLength(1);
    expect(matches[0].context.before).toHaveLength(1);
    expect(matches[0].context.after).toHaveLength(1);
  });

  it('respects maxResults cap', async () => {
    const result = await searchTextTool.execute({ pattern: 'hello', path: tmpDir, maxResults: 1 });
    const matches = JSON.parse(result.content);
    expect(matches).toHaveLength(1);
  });

  it('returns error for invalid regex', async () => {
    const result = await searchTextTool.execute({ pattern: '[invalid', path: tmpDir });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Invalid regex');
  });

  it('returns message when no matches found', async () => {
    const result = await searchTextTool.execute({ pattern: 'zzzznotfound', path: tmpDir });
    expect(result.isError).toBeUndefined();
    expect(result.content).toBe('No matches found');
  });

  it('handles non-existent directory', async () => {
    const result = await searchTextTool.execute({ pattern: 'test', path: '/nonexistent/dir' });
    expect(result.isError).toBe(true);
  });

  it('searches recursively into subdirectories', async () => {
    const result = await searchTextTool.execute({ pattern: 'nested hello', path: tmpDir });
    const matches = JSON.parse(result.content);
    expect(matches).toHaveLength(1);
    expect(matches[0].file).toContain('sub');
  });
});
