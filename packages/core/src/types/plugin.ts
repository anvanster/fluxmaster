import type { Tool } from './tool.js';

export interface FluxmasterPlugin {
  name: string;
  version: string;
  tools?: Tool[];
  init?(): Promise<void>;
  destroy?(): Promise<void>;
}

export interface PluginConfig {
  package: string;
  config?: Record<string, unknown>;
}
