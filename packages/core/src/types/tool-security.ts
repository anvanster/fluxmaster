import { z } from 'zod';

// --- Permission Levels ---

export const ToolPermissionLevelSchema = z.enum(['public', 'restricted', 'dangerous']);
export type ToolPermissionLevel = z.infer<typeof ToolPermissionLevelSchema>;

// --- Default tool classifications ---

export const DEFAULT_TOOL_LEVELS: Record<string, ToolPermissionLevel> = {
  // Filesystem — read-only
  read_file: 'public',
  list_files: 'public',
  search_text: 'public',
  search_files: 'public',
  // Filesystem — mutation
  write_file: 'restricted',
  edit_file: 'restricted',
  // Git — read-only
  git_status: 'public',
  git_diff: 'public',
  git_log: 'public',
  // Git — mutation
  git_commit: 'restricted',
  git_branch: 'restricted',
  // Shell
  bash_execute: 'dangerous',
  // Network
  http_request: 'restricted',
  // Browser
  browser_get_text: 'public',
  browser_screenshot: 'public',
  browser_navigate: 'restricted',
  browser_click: 'restricted',
  browser_fill: 'restricted',
  // Collaboration — read-only
  delegate_to_agent: 'public',
  fan_out: 'public',
  scratchpad_read: 'public',
  scratchpad_list: 'public',
  task_list: 'public',
  // Collaboration — mutation
  scratchpad_write: 'restricted',
  task_create: 'restricted',
  task_update: 'restricted',
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
