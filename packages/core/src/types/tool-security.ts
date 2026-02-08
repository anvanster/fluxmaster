import { z } from 'zod';

// --- Permission Levels ---

export const ToolPermissionLevelSchema = z.enum(['public', 'restricted', 'dangerous']);
export type ToolPermissionLevel = z.infer<typeof ToolPermissionLevelSchema>;

// --- Default tool classifications ---

export const DEFAULT_TOOL_LEVELS: Record<string, ToolPermissionLevel> = {
  read_file: 'public',
  list_files: 'public',
  delegate_to_agent: 'public',
  browser_get_text: 'public',
  browser_screenshot: 'public',
  write_file: 'restricted',
  browser_navigate: 'restricted',
  browser_click: 'restricted',
  browser_fill: 'restricted',
  bash_execute: 'dangerous',
};

// --- Agent-level permission overrides ---

export const AgentToolPermissionsSchema = z.object({
  allowlist: z.array(z.string()).optional(),
  denylist: z.array(z.string()).optional(),
  maxCallsPerMinute: z.number().int().positive().optional(),
});

export type AgentToolPermissions = z.infer<typeof AgentToolPermissionsSchema>;

// --- Filesystem and network sandboxing ---

export const FilesystemPolicySchema = z.object({
  allowedPaths: z.array(z.string()),
  deniedPaths: z.array(z.string()).optional(),
});

export type FilesystemPolicy = z.infer<typeof FilesystemPolicySchema>;

export const NetworkPolicySchema = z.object({
  allowedUrls: z.array(z.string()),
  deniedUrls: z.array(z.string()).optional(),
});

export type NetworkPolicy = z.infer<typeof NetworkPolicySchema>;

// --- Full security policy ---

export const ToolSecurityPolicySchema = z.object({
  defaultLevel: ToolPermissionLevelSchema.default('restricted'),
  toolLevels: z.record(ToolPermissionLevelSchema).default({}),
  agentPermissions: z.record(AgentToolPermissionsSchema).default({}),
  filesystem: FilesystemPolicySchema.optional(),
  network: NetworkPolicySchema.optional(),
}).default({});

export type ToolSecurityPolicy = z.infer<typeof ToolSecurityPolicySchema>;

// --- Audit entry ---

export interface ToolAuditEntry {
  id: string;
  agentId: string;
  toolName: string;
  args: string;
  result: string;
  isError: boolean;
  permitted: boolean;
  denialReason?: string;
  durationMs: number;
  timestamp: Date;
}
