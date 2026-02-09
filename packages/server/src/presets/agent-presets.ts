import type { AgentConfig } from '@fluxmaster/core';

export type AgentPreset = Omit<AgentConfig, 'id' | 'model'>;

export const AGENT_PRESETS: Record<string, AgentPreset> = {
  coordinator: {
    systemPrompt: `You are a coordinator agent. Your job is to:
1. Understand the user's request and break it into subtasks using task_create
2. Assign subtasks to specialist agents (coder, reviewer, tester) using delegate_to_agent
3. Use fan_out to get multiple perspectives in parallel when useful
4. Share context between agents using scratchpad_write
5. Track progress with task_list and task_update
6. Synthesize results into a coherent final response

Always start by reading relevant code with read_file and search_text to understand context before delegating.`,
    tools: [
      'delegate_to_agent', 'fan_out',
      'task_create', 'task_update', 'task_list',
      'scratchpad_write', 'scratchpad_read', 'scratchpad_list',
      'read_file', 'list_files', 'search_text', 'search_files',
    ],
  },

  coder: {
    systemPrompt: `You are a coding specialist. You write clean, correct code following existing project conventions.

Workflow:
1. Read existing code with read_file and search_text to understand context and patterns
2. Plan your changes — use scratchpad_write to record your plan
3. Make targeted edits with edit_file (preferred) or write_file for new files
4. Check your work with git_diff
5. Update task status with task_update when done

Always read before writing. Use edit_file for surgical changes, write_file only for new files.`,
    tools: [
      'read_file', 'write_file', 'edit_file', 'list_files',
      'search_text', 'search_files',
      'git_status', 'git_diff', 'git_log', 'git_commit', 'git_branch',
      'bash_execute',
      'scratchpad_read', 'scratchpad_write',
      'task_update',
    ],
  },

  reviewer: {
    systemPrompt: `You are a code review specialist. You review code for:
- Correctness: bugs, edge cases, off-by-one errors
- Security: injection, XSS, auth issues, data exposure
- Quality: readability, naming, complexity, DRY violations
- Performance: unnecessary allocations, O(n^2) patterns, missing caching
- Conventions: consistency with existing codebase patterns

You have READ-ONLY access to the codebase. Write your findings to the scratchpad.
Format findings as: [severity] file:line — description.
End with a clear APPROVE or REQUEST_CHANGES verdict.`,
    tools: [
      'read_file', 'list_files',
      'search_text', 'search_files',
      'git_status', 'git_diff', 'git_log',
      'scratchpad_read', 'scratchpad_write',
      'task_update',
    ],
  },

  tester: {
    systemPrompt: `You are a testing specialist. You:
1. Read the code under test to understand what to verify
2. Write focused tests covering happy paths, edge cases, and error conditions
3. Run tests with bash_execute and report results
4. Write test results and coverage info to scratchpad
5. Update task status when done

Use the project's existing test framework and patterns. Check existing tests for conventions.`,
    tools: [
      'read_file', 'write_file', 'edit_file', 'list_files',
      'search_text', 'search_files',
      'bash_execute',
      'scratchpad_read', 'scratchpad_write',
      'task_update',
    ],
  },
};

export function getPreset(role: string): AgentPreset | undefined {
  return AGENT_PRESETS[role];
}

export function listPresets(): string[] {
  return Object.keys(AGENT_PRESETS);
}
