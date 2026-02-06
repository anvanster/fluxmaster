import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../app.js';
import { FluxmasterConfigSchema } from '@fluxmaster/core';

describe('fluxmaster init', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxmaster-init-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates fluxmaster.config.json in current directory', async () => {
    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'init']);

    const configPath = path.join(tmpDir, 'fluxmaster.config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    // Should be valid config
    const result = FluxmasterConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('does not overwrite existing config without --force', async () => {
    const configPath = path.join(tmpDir, 'fluxmaster.config.json');
    await fs.writeFile(configPath, '{"existing": true}');

    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'init']);

    // Original content should be preserved
    const content = await fs.readFile(configPath, 'utf-8');
    expect(content).toBe('{"existing": true}');
  });

  it('overwrites with --force', async () => {
    const configPath = path.join(tmpDir, 'fluxmaster.config.json');
    await fs.writeFile(configPath, '{"existing": true}');

    const app = createApp();
    await app.parseAsync(['node', 'fluxmaster', 'init', '--force']);

    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    expect(config.auth).toBeDefined();
  });
});
