import type { FluxmasterPlugin } from '@fluxmaster/core';
import type { ToolRegistry } from '../registry.js';

export class PluginLoader {
  private plugins: Map<string, FluxmasterPlugin> = new Map();

  async register(plugin: FluxmasterPlugin, registry: ToolRegistry): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already registered`);
    }

    if (plugin.init) {
      await plugin.init();
    }

    if (plugin.tools) {
      for (const tool of plugin.tools) {
        registry.register(tool);
      }
    }

    this.plugins.set(plugin.name, plugin);
  }

  async load(pluginPath: string, config?: Record<string, unknown>): Promise<FluxmasterPlugin> {
    const mod = await import(pluginPath);
    if (typeof mod.createPlugin !== 'function') {
      throw new Error(`Plugin at "${pluginPath}" does not export createPlugin()`);
    }
    return mod.createPlugin(config) as FluxmasterPlugin;
  }

  list(): FluxmasterPlugin[] {
    return Array.from(this.plugins.values());
  }

  async unloadAll(registry: ToolRegistry): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.tools) {
        for (const tool of plugin.tools) {
          registry.unregister(tool.name);
        }
      }
      if (plugin.destroy) {
        await plugin.destroy();
      }
    }
    this.plugins.clear();
  }
}
