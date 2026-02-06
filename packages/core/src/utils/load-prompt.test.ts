import { describe, it, expect } from 'vitest';
import { resolvePrompt } from './load-prompt.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('resolvePrompt', () => {
  it('returns undefined for undefined input', async () => {
    expect(await resolvePrompt(undefined, '/tmp')).toBeUndefined();
  });

  it('returns inline string as-is', async () => {
    const result = await resolvePrompt('You are a helpful assistant.', '/tmp');
    expect(result).toBe('You are a helpful assistant.');
  });

  it('loads content from file: prefix', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxmaster-prompt-'));
    const promptFile = path.join(tmpDir, 'system.md');
    await fs.writeFile(promptFile, 'You are an expert coder.');

    try {
      const result = await resolvePrompt(`file:${promptFile}`, tmpDir);
      expect(result).toBe('You are an expert coder.');
    } finally {
      await fs.rm(tmpDir, { recursive: true });
    }
  });

  it('resolves relative file: paths against basePath', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxmaster-prompt-'));
    const promptFile = path.join(tmpDir, 'prompts', 'agent.md');
    await fs.mkdir(path.join(tmpDir, 'prompts'));
    await fs.writeFile(promptFile, 'Agent prompt content.');

    try {
      const result = await resolvePrompt('file:prompts/agent.md', tmpDir);
      expect(result).toBe('Agent prompt content.');
    } finally {
      await fs.rm(tmpDir, { recursive: true });
    }
  });

  it('throws for missing file', async () => {
    await expect(
      resolvePrompt('file:nonexistent.md', '/tmp'),
    ).rejects.toThrow();
  });
});
