import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationList } from './ConversationList';

const mockConversations = [
  { id: 'conv-1', agentId: 'default', title: 'Testing Guide', messageCount: 5, createdAt: '2025-01-01T00:00:00Z', lastActiveAt: '2025-01-01T01:00:00Z' },
  { id: 'conv-2', agentId: 'default', title: undefined as string | undefined, messageCount: 2, createdAt: '2025-01-02T00:00:00Z', lastActiveAt: '2025-01-02T00:30:00Z' },
];

describe('ConversationList', () => {
  it('renders conversation items', () => {
    render(<ConversationList conversations={mockConversations} onSelect={() => {}} />);
    expect(screen.getByText('Testing Guide')).toBeInTheDocument();
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('shows message count', () => {
    render(<ConversationList conversations={mockConversations} onSelect={() => {}} />);
    expect(screen.getByText('5 msgs')).toBeInTheDocument();
    expect(screen.getByText('2 msgs')).toBeInTheDocument();
  });

  it('calls onSelect when conversation is clicked', () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={mockConversations} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Testing Guide'));
    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });

  it('shows empty state when no conversations', () => {
    render(<ConversationList conversations={[]} onSelect={() => {}} />);
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });
});
