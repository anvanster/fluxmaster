export { ToolRegistry } from './registry.js';
export { readFileTool, writeFileTool, listFilesTool } from './filesystem/index.js';
export { bashExecuteTool } from './bash/index.js';
export { searchTextTool, searchFilesTool } from './search/index.js';
export { editFileTool } from './edit/index.js';
export { gitStatusTool, gitDiffTool, gitLogTool, gitCommitTool, gitBranchTool } from './git/index.js';
export { httpRequestTool } from './http/index.js';
export { McpClient, McpServerManager } from './mcp/index.js';
export { BrowserManager, createBrowserTools } from './browser/index.js';
export { PluginLoader } from './plugins/index.js';

import { ToolRegistry } from './registry.js';
import { readFileTool, writeFileTool, listFilesTool } from './filesystem/index.js';
import { bashExecuteTool } from './bash/index.js';
import { searchTextTool, searchFilesTool } from './search/index.js';
import { editFileTool } from './edit/index.js';
import { gitStatusTool, gitDiffTool, gitLogTool, gitCommitTool, gitBranchTool } from './git/index.js';
import { httpRequestTool } from './http/index.js';

/**
 * Create a ToolRegistry pre-loaded with all built-in tools.
 */
export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  // Filesystem
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(listFilesTool);
  registry.register(editFileTool);
  // Search
  registry.register(searchTextTool);
  registry.register(searchFilesTool);
  // Shell
  registry.register(bashExecuteTool);
  // Git
  registry.register(gitStatusTool);
  registry.register(gitDiffTool);
  registry.register(gitLogTool);
  registry.register(gitCommitTool);
  registry.register(gitBranchTool);
  // HTTP
  registry.register(httpRequestTool);
  return registry;
}
