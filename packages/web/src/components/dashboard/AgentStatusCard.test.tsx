import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentStatusCard } from './AgentStatusCard';

describe('AgentStatusCard', () => {
  const agent = { id: 'default', model: 'gpt-4o', status: 'idle' as const };

  it('renders agent id', () => {
    render(<AgentStatusCard agent={agent} />);
    expect(screen.getByText('default')).toBeInTheDocument();
  });

  it('renders agent model', () => {
    render(<AgentStatusCard agent={agent} />);
    expect(screen.getByText('Model: gpt-4o')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<AgentStatusCard agent={agent} />);
    expect(screen.getByText('idle')).toBeInTheDocument();
  });
});
