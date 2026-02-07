import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostByAgent } from './CostByAgent';

describe('CostByAgent', () => {
  it('renders a row per agent', () => {
    render(<CostByAgent byAgent={{ 'agent-1': 2.5, 'agent-2': 1.0 }} />);
    expect(screen.getByText('agent-1')).toBeInTheDocument();
    expect(screen.getByText('agent-2')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();
    expect(screen.getByText('$1.00')).toBeInTheDocument();
  });

  it('renders nothing when no agents', () => {
    const { container } = render(<CostByAgent byAgent={{}} />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('shows heading', () => {
    render(<CostByAgent byAgent={{ test: 0.5 }} />);
    expect(screen.getByText('Cost by Agent')).toBeInTheDocument();
  });
});
