import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { editFileTool } from './edit-file.js';

describe('edit_file tool', () => {
  let tmpDir: string;
  let testFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'edit-file-'));
    testFile = path.join(tmpDir, 'test.ts');
    await fs.writeFile(testFile, 'const x = 1;\nconst y = 2;\nconst z = 3;\n');
  });

  afterAll(async () => {
    // cleanup happens naturally since each test gets a new tmpDir
  });

  it('has correct name and description', () => {
    expect(editFileTool.name).toBe('edit_file');
    expect(editFileTool.description).toBeTruthy();
  });

  it('replaces unique text', async () => {
    const result = await editFileTool.execute({
      path: testFile,
      old_text: 'const y = 2;',
      new_text: 'const y = 42;',
    });
    expect(result.isError).toBeUndefined();
    expect(result.content).toContain('Replaced');
    const content = await fs.readFile(testFile, 'utf-8');
    expect(content).toContain('const y = 42;');
    expect(content).toContain('const x = 1;');
    expect(content).toContain('const z = 3;');
  });

  it('fails when old_text not found', async () => {
    const result = await editFileTool.execute({
      path: testFile,
      old_text: 'const w = 99;',
      new_text: 'replaced',
    });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not found');
  });

  it('fails when old_text appears multiple times', async () => {
    await fs.writeFile(testFile, 'hello\nworld\nhello\n');
    const result = await editFileTool.execute({
      path: testFile,
      old_text: 'hello',
      new_text: 'hi',
    });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('2 times');
  });

  it('handles deletion with empty new_text', async () => {
    const result = await editFileTool.execute({
      path: testFile,
      old_text: 'const y = 2;\n',
      new_text: '',
    });
    expect(result.isError).toBeUndefined();
    const content = await fs.readFile(testFile, 'utf-8');
    expect(content).toBe('const x = 1;\nconst z = 3;\n');
  });

  it('handles non-existent file', async () => {
    const result = await editFileTool.execute({
      path: path.join(tmpDir, 'nonexistent.ts'),
      old_text: 'x',
      new_text: 'y',
    });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Error');
  });

  it('handles multi-line old_text', async () => {
    const result = await editFileTool.execute({
      path: testFile,
      old_text: 'const x = 1;\nconst y = 2;',
      new_text: 'const sum = 3;',
    });
    expect(result.isError).toBeUndefined();
    const content = await fs.readFile(testFile, 'utf-8');
    expect(content).toBe('const sum = 3;\nconst z = 3;\n');
  });
});
