import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { readFileTool } from './read-file.js';
import { writeFileTool } from './write-file.js';
import { listFilesTool } from './list-files.js';

describe('Filesystem Tools', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxmaster-fs-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('read_file', () => {
    it('reads file content from path', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fs.writeFile(filePath, 'hello world');

      const result = await readFileTool.execute({ path: filePath });
      expect(result.content).toBe('hello world');
      expect(result.isError).toBeUndefined();
    });

    it('returns error result for non-existent file', async () => {
      const result = await readFileTool.execute({ path: path.join(tmpDir, 'nonexistent.txt') });
      expect(result.isError).toBe(true);
      expect(result.content).toContain('Error reading file');
    });
  });

  describe('write_file', () => {
    it('creates new file with content', async () => {
      const filePath = path.join(tmpDir, 'new.txt');
      const result = await writeFileTool.execute({ path: filePath, content: 'new content' });
      expect(result.isError).toBeUndefined();

      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe('new content');
    });

    it('overwrites existing file', async () => {
      const filePath = path.join(tmpDir, 'existing.txt');
      await fs.writeFile(filePath, 'old');

      await writeFileTool.execute({ path: filePath, content: 'updated' });
      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe('updated');
    });

    it('creates parent directories if needed', async () => {
      const filePath = path.join(tmpDir, 'deep', 'nested', 'file.txt');
      const result = await writeFileTool.execute({ path: filePath, content: 'deep content' });
      expect(result.isError).toBeUndefined();

      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe('deep content');
    });
  });

  describe('list_files', () => {
    it('returns directory listing', async () => {
      await fs.writeFile(path.join(tmpDir, 'file1.txt'), '');
      await fs.writeFile(path.join(tmpDir, 'file2.txt'), '');
      await fs.mkdir(path.join(tmpDir, 'subdir'));

      const result = await listFilesTool.execute({ path: tmpDir });
      expect(result.content).toContain('file1.txt');
      expect(result.content).toContain('file2.txt');
      expect(result.content).toContain('subdir/');
    });

    it('returns error for non-existent directory', async () => {
      const result = await listFilesTool.execute({ path: path.join(tmpDir, 'nonexistent') });
      expect(result.isError).toBe(true);
    });
  });
});
