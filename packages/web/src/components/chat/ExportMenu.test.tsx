import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportMenu } from './ExportMenu';
import type { ChatMessage } from '@/stores/chat-store';

const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
  { id: '2', role: 'assistant', content: 'Hi', timestamp: new Date() },
];

describe('ExportMenu', () => {
  it('renders export button', () => {
    render(<ExportMenu agentId="default" messages={messages} onImport={vi.fn()} />);
    expect(screen.getByLabelText('Export/Import')).toBeInTheDocument();
  });

  it('shows dropdown options on click', () => {
    render(<ExportMenu agentId="default" messages={messages} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Export/Import'));
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
    expect(screen.getByText('Export Markdown')).toBeInTheDocument();
    expect(screen.getByText('Import JSON')).toBeInTheDocument();
  });

  it('hides dropdown when clicking outside', () => {
    render(<ExportMenu agentId="default" messages={messages} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Export/Import'));
    expect(screen.getByText('Export JSON')).toBeInTheDocument();

    fireEvent.click(document.body);
    expect(screen.queryByText('Export JSON')).toBeNull();
  });
});
