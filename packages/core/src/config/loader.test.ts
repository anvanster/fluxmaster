import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadConfig, generateDefaultConfig } from './loader.js';
import { ConfigNotFoundError, ConfigValidationError } from '../errors/errors.js';

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxmaster-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('loads valid config from file path', async () => {
    const config = {
      auth: {
        copilot: { accountType: 'enterprise', port: 4141 },
        preferDirectApi: false,
      },
      agents: {
        defaults: { maxTokens: 8192, temperature: 0.7 },
        list: [{ id: 'test', model: 'claude-sonnet-4', tools: [] }],
      },
    };
    const configPath = path.join(tmpDir, 'fluxmaster.config.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.auth.copilot?.accountType).toBe('enterprise');
    expect(loaded.agents.list[0].id).toBe('test');
  });

  it('throws ConfigNotFoundError when file does not exist', async () => {
    await expect(loadConfig('/nonexistent/config.json'))
      .rejects.toBeInstanceOf(ConfigNotFoundError);
  });

  it('throws ConfigValidationError for invalid config', async () => {
    const configPath = path.join(tmpDir, 'bad.json');
    await fs.writeFile(configPath, JSON.stringify({
      auth: { copilot: { accountType: 'invalid_type' } },
    }));

    await expect(loadConfig(configPath))
      .rejects.toBeInstanceOf(ConfigValidationError);
  });

  it('applies default values for optional fields', async () => {
    const configPath = path.join(tmpDir, 'minimal.json');
    await fs.writeFile(configPath, JSON.stringify({
      auth: {},
    }));

    const loaded = await loadConfig(configPath);
    expect(loaded.auth.preferDirectApi).toBe(false);
    expect(loaded.agents.defaults.maxTokens).toBe(8192);
    expect(loaded.agents.defaults.temperature).toBe(0.7);
    expect(loaded.agents.list).toEqual([]);
  });

  it('expands environment variables in config values', async () => {
    process.env.TEST_TOKEN = 'my-secret-token';
    const config = {
      auth: {
        copilot: {
          accountType: 'enterprise',
          githubToken: '${TEST_TOKEN}',
        },
      },
    };
    const configPath = path.join(tmpDir, 'env.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.auth.copilot?.githubToken).toBe('my-secret-token');

    delete process.env.TEST_TOKEN;
  });

  it('throws ConfigValidationError for invalid JSON', async () => {
    const configPath = path.join(tmpDir, 'invalid.json');
    await fs.writeFile(configPath, 'not valid json');

    await expect(loadConfig(configPath))
      .rejects.toBeInstanceOf(ConfigValidationError);
  });
});

describe('generateDefaultConfig', () => {
  it('returns a valid default config', () => {
    const config = generateDefaultConfig();
    expect(config.auth.copilot?.accountType).toBe('individual');
    expect(config.auth.copilot?.port).toBe(4141);
    expect(config.agents.defaults.maxTokens).toBe(8192);
    expect(config.agents.list.length).toBe(1);
    expect(config.agents.list[0].id).toBe('default');
  });
});
