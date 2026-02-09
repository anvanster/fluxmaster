import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { searchFilesTool } from './search-files.js';

describe('search_files tool', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-files-'));
    await fs.writeFile(path.join(tmpDir, 'app.ts'), '');
    await fs.writeFile(path.join(tmpDir, 'app.test.ts'), '');
    await fs.writeFile(path.join(tmpDir, 'readme.md'), '');
    await fs.mkdir(path.join(tmpDir, 'src'));
    await fs.writeFile(path.join(tmpDir, 'src', 'index.ts'), '');
    await fs.writeFile(path.join(tmpDir, 'src', 'utils.ts'), '');
    await fs.mkdir(path.join(tmpDir, 'src', 'deep'));
    await fs.writeFile(path.join(tmpDir, 'src', 'deep', 'nested.ts'), '');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('has correct name and description', () => {
    expect(searchFilesTool.name).toBe('search_files');
    expect(searchFilesTool.description).toBeTruthy();
  });

  it('finds files matching glob pattern', async () => {
    const result = await searchFilesTool.execute({ pattern: '*.ts', path: tmpDir });
    expect(result.isError).toBeUndefined();
    const files = result.content.split('\n').filter(Boolean);
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.some((f: string) => f.endsWith('app.ts'))).toBe(true);
  });

  it('supports ** for recursive matching', async () => {
    const result = await searchFilesTool.execute({ pattern: '**/*.ts', path: tmpDir });
    const files = result.content.split('\n').filter(Boolean);
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files.some((f: string) => f.includes('nested.ts'))).toBe(true);
  });

  it('finds .md files', async () => {
    const result = await searchFilesTool.execute({ pattern: '*.md', path: tmpDir });
    const files = result.content.split('\n').filter(Boolean);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('readme.md');
  });

  it('returns empty when no matches', async () => {
    const result = await searchFilesTool.execute({ pattern: '*.json', path: tmpDir });
    expect(result.content).toBe('No files found');
  });

  it('handles non-existent directory', async () => {
    const result = await searchFilesTool.execute({ pattern: '*.ts', path: '/nonexistent/dir' });
    expect(result.isError).toBe(true);
  });

  it('supports test file pattern matching', async () => {
    const result = await searchFilesTool.execute({ pattern: '*.test.ts', path: tmpDir });
    const files = result.content.split('\n').filter(Boolean);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('app.test.ts');
  });
});
