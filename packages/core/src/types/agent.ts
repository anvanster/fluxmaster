import type { Persona } from './persona.js';

export interface AgentConfig {
  id: string;
  model: string;
  systemPrompt?: string;
  tools: string[];
  maxTokens?: number;
  temperature?: number;
  mcpServers?: Array<{
    name: string;
    transport: 'stdio' | 'sse';
    command?: string;
    args?: string[];
    url?: string;
    env?: Record<string, string>;
  }>;
  persona?: Persona;
  personaRef?: string;
}

export type MessageRole = 'user' | 'assistant' | 'tool';

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResultBlock {
  type: 'tool_result';
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
  timestamp: Date;
}

export interface AgentSession {
  id: string;
  agentConfig: AgentConfig;
  messages: Message[];
  createdAt: Date;
  lastActiveAt: Date;
  isActive: boolean;
}

export type AgentStatus = 'idle' | 'processing' | 'error' | 'terminated';

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
