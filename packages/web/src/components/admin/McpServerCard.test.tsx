import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpServerCard } from './McpServerCard';

describe('McpServerCard', () => {
  const server = { name: 'github', transport: 'stdio' as const, command: 'npx github-mcp' };
  const handlers = { onStart: vi.fn(), onStop: vi.fn() };

  it('renders server name and transport', () => {
    render(<McpServerCard server={server} isRunning={false} {...handlers} />);
    expect(screen.getByText('github')).toBeInTheDocument();
    expect(screen.getByText('stdio')).toBeInTheDocument();
  });

  it('shows Start button when not running', () => {
    render(<McpServerCard server={server} isRunning={false} {...handlers} />);
    fireEvent.click(screen.getByText('Start'));
    expect(handlers.onStart).toHaveBeenCalled();
  });

  it('shows Stop button when running', () => {
    render(<McpServerCard server={server} isRunning={true} {...handlers} />);
    fireEvent.click(screen.getByText('Stop'));
    expect(handlers.onStop).toHaveBeenCalled();
  });
});
