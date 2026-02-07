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

  it('loads config with mcpServers section', async () => {
    const config = {
      auth: {},
      mcpServers: {
        global: [
          {
            name: 'filesystem',
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', './workspace'],
          },
        ],
      },
    };
    const configPath = path.join(tmpDir, 'mcp.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.mcpServers.global).toHaveLength(1);
    expect(loaded.mcpServers.global[0].name).toBe('filesystem');
    expect(loaded.mcpServers.global[0].transport).toBe('stdio');
  });

  it('loads config with agent-level mcpServers', async () => {
    const config = {
      auth: {},
      agents: {
        list: [{
          id: 'coder',
          model: 'claude-sonnet-4',
          tools: [],
          mcpServers: [{
            name: 'github',
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: 'test-token' },
          }],
        }],
      },
    };
    const configPath = path.join(tmpDir, 'agent-mcp.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.agents.list[0].mcpServers).toHaveLength(1);
    expect(loaded.agents.list[0].mcpServers[0].name).toBe('github');
  });

  it('loads config with browser section', async () => {
    const config = {
      auth: {},
      browser: {
        headless: false,
        userDataDir: '/tmp/browser',
      },
    };
    const configPath = path.join(tmpDir, 'browser.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.browser?.headless).toBe(false);
    expect(loaded.browser?.userDataDir).toBe('/tmp/browser');
    expect(loaded.browser?.viewport.width).toBe(1280);
  });

  it('resolves file: systemPrompt from relative path', async () => {
    const promptsDir = path.join(tmpDir, 'prompts');
    await fs.mkdir(promptsDir);
    await fs.writeFile(path.join(promptsDir, 'agent.md'), 'You are an expert coder.');

    const config = {
      auth: {},
      agents: {
        list: [{
          id: 'coder',
          model: 'claude-sonnet-4',
          tools: [],
          systemPrompt: 'file:prompts/agent.md',
        }],
      },
    };
    const configPath = path.join(tmpDir, 'fileprompt.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.agents.list[0].systemPrompt).toBe('You are an expert coder.');
  });

  it('keeps inline systemPrompt unchanged', async () => {
    const config = {
      auth: {},
      agents: {
        list: [{
          id: 'default',
          model: 'claude-sonnet-4',
          tools: [],
          systemPrompt: 'You are a helpful assistant.',
        }],
      },
    };
    const configPath = path.join(tmpDir, 'inline.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.agents.list[0].systemPrompt).toBe('You are a helpful assistant.');
  });

  it('defaults mcpServers to empty global array', async () => {
    const configPath = path.join(tmpDir, 'nomcp.json');
    await fs.writeFile(configPath, JSON.stringify({ auth: {} }));

    const loaded = await loadConfig(configPath);
    expect(loaded.mcpServers.global).toEqual([]);
  });

  it('applies retry config defaults', async () => {
    const configPath = path.join(tmpDir, 'retry.json');
    await fs.writeFile(configPath, JSON.stringify({ auth: {} }));

    const loaded = await loadConfig(configPath);
    expect(loaded.retry.maxAttempts).toBe(3);
    expect(loaded.retry.baseDelayMs).toBe(1000);
    expect(loaded.retry.maxDelayMs).toBe(30000);
  });

  it('loads config with plugins section', async () => {
    const config = {
      auth: {},
      plugins: [
        { package: '@fluxmaster/plugin-git', config: { token: 'abc' } },
      ],
    };
    const configPath = path.join(tmpDir, 'plugins.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.plugins).toHaveLength(1);
    expect(loaded.plugins[0].package).toBe('@fluxmaster/plugin-git');
    expect(loaded.plugins[0].config).toEqual({ token: 'abc' });
  });

  it('defaults plugins to empty array', async () => {
    const configPath = path.join(tmpDir, 'noplugins.json');
    await fs.writeFile(configPath, JSON.stringify({ auth: {} }));

    const loaded = await loadConfig(configPath);
    expect(loaded.plugins).toEqual([]);
  });

  it('provides default pricing for common models', async () => {
    const configPath = path.join(tmpDir, 'defaultpricing.json');
    await fs.writeFile(configPath, JSON.stringify({ auth: {} }));

    const loaded = await loadConfig(configPath);
    expect(loaded.pricing['gpt-4o']).toEqual({ inputPer1M: 2.5, outputPer1M: 10 });
    expect(loaded.pricing['claude-sonnet-4']).toEqual({ inputPer1M: 3, outputPer1M: 15 });
    expect(loaded.pricing['claude-opus-4']).toEqual({ inputPer1M: 15, outputPer1M: 75 });
  });

  it('provides default database config', async () => {
    const configPath = path.join(tmpDir, 'defaultdb.json');
    await fs.writeFile(configPath, JSON.stringify({ auth: {} }));

    const loaded = await loadConfig(configPath);
    expect(loaded.database.path).toBe('fluxmaster.db');
    expect(loaded.database.walMode).toBe(true);
    expect(loaded.database.maxEventAge).toBe(604800);
  });

  it('allows custom database config', async () => {
    const config = {
      auth: {},
      database: {
        path: '/data/custom.db',
        walMode: false,
        maxEventAge: 86400,
      },
    };
    const configPath = path.join(tmpDir, 'customdb.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.database.path).toBe('/data/custom.db');
    expect(loaded.database.walMode).toBe(false);
    expect(loaded.database.maxEventAge).toBe(86400);
  });

  it('provides default AI feature config', async () => {
    const configPath = path.join(tmpDir, 'defaultai.json');
    await fs.writeFile(configPath, JSON.stringify({ auth: {} }));

    const loaded = await loadConfig(configPath);
    expect(loaded.aiFeatures.autoTitle).toBe(true);
    expect(loaded.aiFeatures.conversationSummary).toBe(false);
    expect(loaded.aiFeatures.suggestedFollowUps).toBe(true);
    expect(loaded.aiFeatures.model).toBe('gpt-4o-mini');
  });

  it('allows custom AI feature config', async () => {
    const config = {
      auth: {},
      aiFeatures: {
        autoTitle: false,
        conversationSummary: true,
        suggestedFollowUps: false,
        model: 'claude-haiku-3.5',
      },
    };
    const configPath = path.join(tmpDir, 'customai.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.aiFeatures.autoTitle).toBe(false);
    expect(loaded.aiFeatures.conversationSummary).toBe(true);
    expect(loaded.aiFeatures.suggestedFollowUps).toBe(false);
    expect(loaded.aiFeatures.model).toBe('claude-haiku-3.5');
  });

  it('allows custom pricing overrides', async () => {
    const config = {
      auth: {},
      pricing: {
        'custom-model': { inputPer1M: 1, outputPer1M: 2 },
      },
    };
    const configPath = path.join(tmpDir, 'custompricing.json');
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadConfig(configPath);
    expect(loaded.pricing['custom-model']).toEqual({ inputPer1M: 1, outputPer1M: 2 });
    // Custom pricing replaces defaults entirely
    expect(loaded.pricing['gpt-4o']).toBeUndefined();
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
    expect(config.mcpServers.global).toEqual([]);
  });
});
