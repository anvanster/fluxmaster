import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginLoader } from './plugin-loader.js';
import { ToolRegistry } from '../registry.js';
import type { FluxmasterPlugin } from '@fluxmaster/core';
import { z } from 'zod';

function createMockPlugin(overrides: Partial<FluxmasterPlugin> = {}): FluxmasterPlugin {
  return {
    name: 'test-plugin',
    version: '1.0.0',
    tools: [
      {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: z.object({ input: z.string() }),
        execute: vi.fn().mockResolvedValue({ content: 'result' }),
      },
    ],
    ...overrides,
  };
}

describe('PluginLoader', () => {
  let loader: PluginLoader;
  let registry: ToolRegistry;

  beforeEach(() => {
    loader = new PluginLoader();
    registry = new ToolRegistry();
  });

  it('registers a plugin and its tools', async () => {
    const plugin = createMockPlugin();

    await loader.register(plugin, registry);

    expect(registry.has('test_tool')).toBe(true);
    expect(loader.list()).toHaveLength(1);
    expect(loader.list()[0].name).toBe('test-plugin');
  });

  it('calls plugin init() during registration', async () => {
    const init = vi.fn().mockResolvedValue(undefined);
    const plugin = createMockPlugin({ init });

    await loader.register(plugin, registry);

    expect(init).toHaveBeenCalledOnce();
  });

  it('throws on duplicate plugin registration', async () => {
    const plugin = createMockPlugin();

    await loader.register(plugin, registry);
    await expect(loader.register(plugin, registry))
      .rejects.toThrow('already registered');
  });

  it('registers plugin with no tools', async () => {
    const plugin = createMockPlugin({ tools: undefined });

    await loader.register(plugin, registry);

    expect(loader.list()).toHaveLength(1);
    expect(registry.list()).toHaveLength(0);
  });

  it('unloads all plugins and calls destroy()', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    const plugin = createMockPlugin({ destroy });

    await loader.register(plugin, registry);
    expect(loader.list()).toHaveLength(1);

    await loader.unloadAll(registry);

    expect(destroy).toHaveBeenCalledOnce();
    expect(loader.list()).toHaveLength(0);
    expect(registry.has('test_tool')).toBe(false);
  });

  it('unloads gracefully when plugin has no destroy()', async () => {
    const plugin = createMockPlugin({ destroy: undefined });

    await loader.register(plugin, registry);
    await loader.unloadAll(registry);

    expect(loader.list()).toHaveLength(0);
  });
});
