import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentStatusGrid } from './AgentStatusGrid';

describe('AgentStatusGrid', () => {
  it('renders agent cards', () => {
    const agents = [
      { id: 'default', model: 'gpt-4o', status: 'idle' as const },
      { id: 'researcher', model: 'claude-sonnet-4', status: 'processing' as const },
    ];
    render(<AgentStatusGrid agents={agents} />);
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('researcher')).toBeInTheDocument();
  });

  it('shows empty state when no agents', () => {
    render(<AgentStatusGrid agents={[]} />);
    expect(screen.getByText('No agents running')).toBeInTheDocument();
  });
});
