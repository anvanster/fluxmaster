import type { EventBus, ToolSecurityPolicy, IToolAuditStore } from '@fluxmaster/core';
import { DEFAULT_TOOL_LEVELS } from '@fluxmaster/core';
import type { ToolPermissionLevel } from '@fluxmaster/core';
import { RateLimiter } from './rate-limiter.js';

const PERMISSION_RANK: Record<ToolPermissionLevel, number> = {
  public: 0,
  restricted: 1,
  dangerous: 2,
};

const FILE_TOOLS = new Set(['read_file', 'write_file', 'list_files', 'edit_file', 'search_text', 'search_files']);
const NETWORK_TOOLS = new Set(['browser_navigate', 'browser_click', 'browser_fill', 'browser_get_text', 'http_request']);

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
}

export class ToolSecurityManager {
  private policy: ToolSecurityPolicy;
  private eventBus: EventBus;
  private auditStore: IToolAuditStore;
  private rateLimiter = new RateLimiter();

  constructor(policy: ToolSecurityPolicy, eventBus: EventBus, auditStore: IToolAuditStore) {
    this.policy = policy;
    this.eventBus = eventBus;
    this.auditStore = auditStore;
  }

  canExecute(agentId: string, toolName: string, args: Record<string, unknown>): SecurityCheckResult {
    // 1. Check denylist first (highest priority)
    const agentPerms = this.policy.agentPermissions[agentId];
    if (agentPerms?.denylist?.includes(toolName)) {
      const reason = `Tool '${toolName}' is on agent '${agentId}' denylist`;
      this.emitDenied(agentId, toolName, reason);
      return { allowed: false, reason };
    }

    // 2. Check permission level (unless agent has explicit allowlist override)
    const toolLevel = this.getToolLevel(toolName);
    const maxAllowedRank = PERMISSION_RANK[this.policy.defaultLevel];
    const toolRank = PERMISSION_RANK[toolLevel];

    if (toolRank > maxAllowedRank && !agentPerms?.allowlist?.includes(toolName)) {
      const reason = `Tool '${toolName}' is classified as '${toolLevel}' but max allowed level is '${this.policy.defaultLevel}'`;
      this.emitDenied(agentId, toolName, reason);
      return { allowed: false, reason };
    }

    // 3. Check rate limit
    if (agentPerms?.maxCallsPerMinute) {
      const key = `${agentId}:${toolName}`;
      if (!this.rateLimiter.check(key, agentPerms.maxCallsPerMinute)) {
        const count = this.rateLimiter.getCallCount(key);
        const reason = `Rate limit exceeded for agent '${agentId}': ${count}/${agentPerms.maxCallsPerMinute} calls/min`;
        this.eventBus.emit({
          type: 'security:rate_limited',
          agentId,
          toolName,
          callsPerMinute: count,
          limit: agentPerms.maxCallsPerMinute,
          timestamp: new Date(),
        });
        return { allowed: false, reason };
      }
    }

    // 4. Check filesystem policy
    if (this.policy.filesystem && FILE_TOOLS.has(toolName)) {
      const path = args.path as string | undefined;
      if (path) {
        const fsResult = this.checkFilesystemPolicy(path);
        if (!fsResult.allowed) {
          this.emitDenied(agentId, toolName, fsResult.reason!);
          return fsResult;
        }
      }
    }

    // 5. Check network policy
    if (this.policy.network && NETWORK_TOOLS.has(toolName)) {
      const url = args.url as string | undefined;
      if (url) {
        const netResult = this.checkNetworkPolicy(url);
        if (!netResult.allowed) {
          this.emitDenied(agentId, toolName, netResult.reason!);
          return netResult;
        }
      }
    }

    return { allowed: true };
  }

  recordExecution(agentId: string, toolName: string): void {
    const key = `${agentId}:${toolName}`;
    this.rateLimiter.record(key);
  }

  private getToolLevel(toolName: string): ToolPermissionLevel {
    return this.policy.toolLevels[toolName]
      ?? DEFAULT_TOOL_LEVELS[toolName]
      ?? this.policy.defaultLevel;
  }

  private checkFilesystemPolicy(path: string): SecurityCheckResult {
    const fs = this.policy.filesystem!;

    // Check denied paths first
    if (fs.deniedPaths?.some((denied) => path.startsWith(denied))) {
      return { allowed: false, reason: `File path '${path}' matches a denied path` };
    }

    // Check allowed paths
    if (!fs.allowedPaths.some((allowed) => path.startsWith(allowed))) {
      return { allowed: false, reason: `File path '${path}' is outside allowed paths` };
    }

    return { allowed: true };
  }

  private checkNetworkPolicy(url: string): SecurityCheckResult {
    const net = this.policy.network!;

    // Check denied URLs first
    if (net.deniedUrls?.some((denied) => url.startsWith(denied))) {
      return { allowed: false, reason: `URL '${url}' matches a denied URL pattern` };
    }

    // Check allowed URLs
    if (!net.allowedUrls.some((allowed) => url.startsWith(allowed))) {
      return { allowed: false, reason: `URL '${url}' is not in allowed URL patterns` };
    }

    return { allowed: true };
  }

  private emitDenied(agentId: string, toolName: string, reason: string): void {
    this.eventBus.emit({
      type: 'security:tool_denied',
      agentId,
      toolName,
      reason,
      timestamp: new Date(),
    });
  }
}
