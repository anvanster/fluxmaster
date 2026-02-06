import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentSelector } from './AgentSelector';

const agents = [
  { id: 'default', model: 'gpt-4o', status: 'idle' as const },
  { id: 'researcher', model: 'claude-sonnet-4', status: 'processing' as const },
];

describe('AgentSelector', () => {
  it('renders agent buttons', () => {
    render(<AgentSelector agents={agents} activeId="default" onSelect={vi.fn()} />);
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('researcher')).toBeInTheDocument();
  });

  it('calls onSelect when agent clicked', () => {
    const onSelect = vi.fn();
    render(<AgentSelector agents={agents} activeId="default" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('researcher'));
    expect(onSelect).toHaveBeenCalledWith('researcher');
  });

  it('renders nothing when no agents', () => {
    const { container } = render(<AgentSelector agents={[]} activeId="default" onSelect={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
