import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '@/stores/chat-store';
import {
  exportAsJson,
  exportAsMarkdown,
  parseImportJson,
  type ExportedConversation,
} from './export';

const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Hello', timestamp: new Date('2025-01-15T10:00:00Z') },
  { id: '2', role: 'assistant', content: 'Hi there!', timestamp: new Date('2025-01-15T10:00:01Z') },
  {
    id: '3',
    role: 'assistant',
    content: 'Result from tool',
    timestamp: new Date('2025-01-15T10:00:02Z'),
    toolCalls: [{ name: 'read_file', status: 'done', result: 'file contents' }],
  },
];

describe('exportAsJson', () => {
  it('produces valid export format', () => {
    const json = exportAsJson('agent-1', messages);
    const parsed: ExportedConversation = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.agentId).toBe('agent-1');
    expect(parsed.messageCount).toBe(3);
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.exportedAt).toBeDefined();
  });

  it('preserves message content and roles', () => {
    const json = exportAsJson('agent-1', messages);
    const parsed: ExportedConversation = JSON.parse(json);

    expect(parsed.messages[0].role).toBe('user');
    expect(parsed.messages[0].content).toBe('Hello');
    expect(parsed.messages[1].role).toBe('assistant');
  });

  it('includes tool calls', () => {
    const json = exportAsJson('agent-1', messages);
    const parsed: ExportedConversation = JSON.parse(json);

    expect(parsed.messages[2].toolCalls).toHaveLength(1);
    expect(parsed.messages[2].toolCalls![0].name).toBe('read_file');
  });

  it('handles empty messages', () => {
    const json = exportAsJson('agent-1', []);
    const parsed: ExportedConversation = JSON.parse(json);

    expect(parsed.messageCount).toBe(0);
    expect(parsed.messages).toEqual([]);
  });
});

describe('exportAsMarkdown', () => {
  it('produces YAML frontmatter', () => {
    const md = exportAsMarkdown('agent-1', messages);
    expect(md).toContain('---');
    expect(md).toContain('agentId: agent-1');
    expect(md).toContain('messageCount: 3');
  });

  it('formats user and assistant blocks', () => {
    const md = exportAsMarkdown('agent-1', messages);
    expect(md).toContain('**User:**');
    expect(md).toContain('Hello');
    expect(md).toContain('**Assistant:**');
    expect(md).toContain('Hi there!');
  });

  it('includes tool call info', () => {
    const md = exportAsMarkdown('agent-1', messages);
    expect(md).toContain('read_file');
  });

  it('handles empty messages', () => {
    const md = exportAsMarkdown('agent-1', []);
    expect(md).toContain('agentId: agent-1');
    expect(md).toContain('messageCount: 0');
  });
});

describe('parseImportJson', () => {
  it('parses valid export JSON', () => {
    const json = exportAsJson('agent-1', messages);
    const result = parseImportJson(json);

    expect(result.agentId).toBe('agent-1');
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseImportJson('not json')).toThrow();
  });

  it('throws on missing version field', () => {
    expect(() => parseImportJson(JSON.stringify({ agentId: 'x', messages: [] }))).toThrow();
  });

  it('throws on wrong version', () => {
    expect(() =>
      parseImportJson(
        JSON.stringify({ version: 999, agentId: 'x', messageCount: 0, messages: [], exportedAt: '' }),
      ),
    ).toThrow();
  });

  it('throws on missing messages', () => {
    expect(() =>
      parseImportJson(JSON.stringify({ version: 1, agentId: 'x', messageCount: 0, exportedAt: '' })),
    ).toThrow();
  });

  it('reconstructs Date objects', () => {
    const json = exportAsJson('agent-1', messages);
    const result = parseImportJson(json);

    expect(result.messages[0].timestamp).toBeInstanceOf(Date);
    expect(result.messages[0].timestamp.getFullYear()).toBe(2025);
  });
});
