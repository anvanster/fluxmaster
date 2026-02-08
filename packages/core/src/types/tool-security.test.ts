import { describe, it, expect } from 'vitest';
import {
  ToolPermissionLevelSchema,
  ToolSecurityPolicySchema,
  AgentToolPermissionsSchema,
  FilesystemPolicySchema,
  NetworkPolicySchema,
  DEFAULT_TOOL_LEVELS,
} from './tool-security.js';

describe('ToolPermissionLevelSchema', () => {
  it('accepts valid levels', () => {
    expect(ToolPermissionLevelSchema.parse('public')).toBe('public');
    expect(ToolPermissionLevelSchema.parse('restricted')).toBe('restricted');
    expect(ToolPermissionLevelSchema.parse('dangerous')).toBe('dangerous');
  });

  it('rejects invalid levels', () => {
    expect(() => ToolPermissionLevelSchema.parse('unknown')).toThrow();
    expect(() => ToolPermissionLevelSchema.parse('')).toThrow();
  });
});

describe('AgentToolPermissionsSchema', () => {
  it('parses allowlist and denylist', () => {
    const result = AgentToolPermissionsSchema.parse({
      allowlist: ['read_file', 'write_file'],
      denylist: ['bash_execute'],
      maxCallsPerMinute: 60,
    });
    expect(result.allowlist).toEqual(['read_file', 'write_file']);
    expect(result.denylist).toEqual(['bash_execute']);
    expect(result.maxCallsPerMinute).toBe(60);
  });

  it('all fields are optional', () => {
    const result = AgentToolPermissionsSchema.parse({});
    expect(result.allowlist).toBeUndefined();
    expect(result.denylist).toBeUndefined();
    expect(result.maxCallsPerMinute).toBeUndefined();
  });

  it('rejects non-positive maxCallsPerMinute', () => {
    expect(() => AgentToolPermissionsSchema.parse({ maxCallsPerMinute: 0 })).toThrow();
    expect(() => AgentToolPermissionsSchema.parse({ maxCallsPerMinute: -1 })).toThrow();
  });
});

describe('FilesystemPolicySchema', () => {
  it('parses allowed and denied paths', () => {
    const result = FilesystemPolicySchema.parse({
      allowedPaths: ['/tmp', '/home/user/projects'],
      deniedPaths: ['/etc'],
    });
    expect(result.allowedPaths).toHaveLength(2);
    expect(result.deniedPaths).toEqual(['/etc']);
  });

  it('deniedPaths is optional', () => {
    const result = FilesystemPolicySchema.parse({ allowedPaths: ['/tmp'] });
    expect(result.deniedPaths).toBeUndefined();
  });
});

describe('NetworkPolicySchema', () => {
  it('parses allowed and denied URLs', () => {
    const result = NetworkPolicySchema.parse({
      allowedUrls: ['https://example.com', 'https://api.github.com'],
      deniedUrls: ['https://evil.com'],
    });
    expect(result.allowedUrls).toHaveLength(2);
    expect(result.deniedUrls).toEqual(['https://evil.com']);
  });
});

describe('ToolSecurityPolicySchema', () => {
  it('provides sensible defaults', () => {
    const result = ToolSecurityPolicySchema.parse({});
    expect(result.defaultLevel).toBe('restricted');
    expect(result.toolLevels).toEqual({});
    expect(result.agentPermissions).toEqual({});
    expect(result.filesystem).toBeUndefined();
    expect(result.network).toBeUndefined();
  });

  it('parses full policy with all fields', () => {
    const result = ToolSecurityPolicySchema.parse({
      defaultLevel: 'public',
      toolLevels: { bash_execute: 'dangerous', write_file: 'restricted' },
      agentPermissions: {
        researcher: { allowlist: ['read_file'], maxCallsPerMinute: 30 },
      },
      filesystem: { allowedPaths: ['/tmp'] },
      network: { allowedUrls: ['https://example.com'] },
    });
    expect(result.defaultLevel).toBe('public');
    expect(result.toolLevels.bash_execute).toBe('dangerous');
    expect(result.agentPermissions.researcher?.allowlist).toEqual(['read_file']);
    expect(result.filesystem?.allowedPaths).toEqual(['/tmp']);
    expect(result.network?.allowedUrls).toEqual(['https://example.com']);
  });

  it('rejects invalid defaultLevel', () => {
    expect(() => ToolSecurityPolicySchema.parse({ defaultLevel: 'invalid' })).toThrow();
  });
});

describe('DEFAULT_TOOL_LEVELS', () => {
  it('classifies read-only tools as public', () => {
    expect(DEFAULT_TOOL_LEVELS.read_file).toBe('public');
    expect(DEFAULT_TOOL_LEVELS.list_files).toBe('public');
    expect(DEFAULT_TOOL_LEVELS.delegate_to_agent).toBe('public');
    expect(DEFAULT_TOOL_LEVELS.browser_get_text).toBe('public');
    expect(DEFAULT_TOOL_LEVELS.browser_screenshot).toBe('public');
  });

  it('classifies write tools as restricted', () => {
    expect(DEFAULT_TOOL_LEVELS.write_file).toBe('restricted');
    expect(DEFAULT_TOOL_LEVELS.browser_navigate).toBe('restricted');
    expect(DEFAULT_TOOL_LEVELS.browser_click).toBe('restricted');
    expect(DEFAULT_TOOL_LEVELS.browser_fill).toBe('restricted');
  });

  it('classifies shell execution as dangerous', () => {
    expect(DEFAULT_TOOL_LEVELS.bash_execute).toBe('dangerous');
  });
});
