export { ToolRegistry } from './registry.js';
export { readFileTool, writeFileTool, listFilesTool } from './filesystem/index.js';
export { bashExecuteTool } from './bash/index.js';
export { McpClient, McpServerManager } from './mcp/index.js';
export { BrowserManager, createBrowserTools } from './browser/index.js';
export { PluginLoader } from './plugins/index.js';

import { ToolRegistry } from './registry.js';
import { readFileTool, writeFileTool, listFilesTool } from './filesystem/index.js';
import { bashExecuteTool } from './bash/index.js';

/**
 * Create a ToolRegistry pre-loaded with all built-in tools.
 */
export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(listFilesTool);
  registry.register(bashExecuteTool);
  return registry;
}
