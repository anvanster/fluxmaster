import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette, type Command } from './CommandPalette';

const commands: Command[] = [
  { id: 'chat', label: 'Go to Chat', category: 'Navigation', action: vi.fn() },
  { id: 'dashboard', label: 'Go to Dashboard', category: 'Navigation', action: vi.fn() },
  { id: 'admin', label: 'Go to Admin', category: 'Navigation', action: vi.fn() },
  { id: 'shortcuts', label: 'Show Shortcuts', category: 'Help', action: vi.fn() },
];

describe('CommandPalette', () => {
  it('renders when open', () => {
    render(<CommandPalette open commands={commands} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CommandPalette open={false} commands={commands} onClose={vi.fn()} />);
    expect(screen.queryByPlaceholderText('Type a command...')).toBeNull();
  });

  it('filters commands by search text', () => {
    render(<CommandPalette open commands={commands} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Type a command...'), {
      target: { value: 'chat' },
    });
    expect(screen.getByText('Go to Chat')).toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard')).toBeNull();
  });

  it('shows all commands when search is empty', () => {
    render(<CommandPalette open commands={commands} onClose={vi.fn()} />);
    expect(screen.getByText('Go to Chat')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Show Shortcuts')).toBeInTheDocument();
  });

  it('executes command on click and closes', () => {
    const onClose = vi.fn();
    render(<CommandPalette open commands={commands} onClose={onClose} />);
    fireEvent.click(screen.getByText('Go to Chat'));
    expect(commands[0].action).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('navigates with arrow keys', () => {
    render(<CommandPalette open commands={commands} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Type a command...');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Should execute the second item (index 1 after down-down-up = index 1)
    expect(commands[1].action).toHaveBeenCalledOnce();
  });

  it('groups commands by category', () => {
    render(<CommandPalette open commands={commands} onClose={vi.fn()} />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<CommandPalette open commands={commands} onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Type a command...'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
