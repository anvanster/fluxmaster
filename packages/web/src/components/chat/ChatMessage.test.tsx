import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/stores/chat-store';

describe('ChatMessage', () => {
  const userMsg: ChatMessageType = {
    id: '1',
    role: 'user',
    content: 'Hello world',
    timestamp: new Date(),
  };

  const assistantMsg: ChatMessageType = {
    id: '2',
    role: 'assistant',
    content: 'Hi there!',
    timestamp: new Date(),
    toolCalls: [{ name: 'read_file', status: 'done' }],
  };

  it('renders user message content', () => {
    render(<ChatMessage message={userMsg} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders assistant message with markdown and tool calls', () => {
    render(<ChatMessage message={assistantMsg} />);
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    expect(screen.getByText('read_file')).toBeInTheDocument();
  });

  it('renders user message as plain text (no markdown)', () => {
    render(<ChatMessage message={userMsg} />);
    expect(screen.getByTestId('chat-message')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
  });

  it('has correct test id', () => {
    render(<ChatMessage message={userMsg} />);
    expect(screen.getByTestId('chat-message')).toBeInTheDocument();
  });
});
