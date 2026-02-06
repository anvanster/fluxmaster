import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageChart } from './UsageChart';

describe('UsageChart', () => {
  it('renders bars for each agent', () => {
    const byAgent = {
      'agent-1': { inputTokens: 100, outputTokens: 50, requestCount: 2 },
      'agent-2': { inputTokens: 200, outputTokens: 100, requestCount: 3 },
    };
    render(<UsageChart byAgent={byAgent} />);
    expect(screen.getByText('agent-1')).toBeInTheDocument();
    expect(screen.getByText('agent-2')).toBeInTheDocument();
  });

  it('returns null for empty data', () => {
    const { container } = render(<UsageChart byAgent={{}} />);
    expect(container.innerHTML).toBe('');
  });
});
