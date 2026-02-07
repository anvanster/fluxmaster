import type { ChatMessage } from '@/stores/chat-store';

export interface ExportedConversation {
  version: 1;
  exportedAt: string;
  agentId: string;
  messageCount: number;
  messages: ChatMessage[];
}

export function exportAsJson(agentId: string, messages: ChatMessage[]): string {
  const data: ExportedConversation = {
    version: 1,
    exportedAt: new Date().toISOString(),
    agentId,
    messageCount: messages.length,
    messages,
  };
  return JSON.stringify(data, null, 2);
}

export function exportAsMarkdown(agentId: string, messages: ChatMessage[]): string {
  const lines: string[] = [];

  // YAML frontmatter
  lines.push('---');
  lines.push(`agentId: ${agentId}`);
  lines.push(`exportedAt: ${new Date().toISOString()}`);
  lines.push(`messageCount: ${messages.length}`);
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    const label = msg.role === 'user' ? '**User:**' : '**Assistant:**';
    lines.push(label);
    lines.push('');
    lines.push(msg.content);

    if (msg.toolCalls && msg.toolCalls.length > 0) {
      lines.push('');
      lines.push('_Tool calls:_');
      for (const tc of msg.toolCalls) {
        lines.push(`- ${tc.name} (${tc.status})`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function parseImportJson(jsonStr: string): { agentId: string; messages: ChatMessage[] } {
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON format');
  }

  const obj = data as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error('Unsupported export version');
  }
  if (!Array.isArray(obj.messages)) {
    throw new Error('Missing messages array');
  }
  if (typeof obj.agentId !== 'string') {
    throw new Error('Missing agentId');
  }

  const messages = (obj.messages as ChatMessage[]).map((msg) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));

  return { agentId: obj.agentId, messages };
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
