import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostByAgent } from './CostByAgent';

describe('CostByAgent', () => {
  it('renders a row per agent with dollar cost', () => {
    render(
      <CostByAgent
        byAgent={{
          'agent-1': { amount: 2.5, unit: 'cost' },
          'agent-2': { amount: 1.0, unit: 'cost' },
        }}
      />,
    );
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
    render(<CostByAgent byAgent={{ test: { amount: 0.5, unit: 'cost' } }} />);
    expect(screen.getByText('Usage by Agent')).toBeInTheDocument();
  });

  it('renders premium requests for copilot agents', () => {
    render(
      <CostByAgent
        byAgent={{
          'copilot-agent': { amount: 3, unit: 'premium_requests' },
        }}
      />,
    );
    expect(screen.getByText('copilot-agent')).toBeInTheDocument();
    expect(screen.getByText('3.0 reqs')).toBeInTheDocument();
  });

  it('renders mixed units', () => {
    render(
      <CostByAgent
        byAgent={{
          cop: { amount: 5, unit: 'premium_requests' },
          api: { amount: 1.25, unit: 'cost' },
        }}
      />,
    );
    expect(screen.getByText('5.0 reqs')).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();
  });
});
