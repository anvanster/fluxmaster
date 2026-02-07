import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShortcutsModal } from './ShortcutsModal';

describe('ShortcutsModal', () => {
  it('renders shortcuts table when open', () => {
    render(<ShortcutsModal open onClose={vi.fn()} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Open command palette')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ShortcutsModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Keyboard Shortcuts')).toBeNull();
  });

  it('shows platform-appropriate modifier', () => {
    render(<ShortcutsModal open onClose={vi.fn()} />);
    // Should show either Cmd or Ctrl depending on platform
    const text = screen.getByTestId('shortcuts-table').textContent;
    expect(text).toMatch(/[Cmd|Ctrl]\+K/);
  });
});
