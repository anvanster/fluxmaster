import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostSummary } from './CostSummary';

describe('CostSummary', () => {
  it('displays dollar cost when present', () => {
    render(<CostSummary totalCost={7.5} totalPremiumRequests={0} />);
    expect(screen.getByText('$7.50')).toBeInTheDocument();
  });

  it('shows <$0.01 for zero cost and zero requests', () => {
    render(<CostSummary totalCost={0} totalPremiumRequests={0} />);
    expect(screen.getByText('<$0.01')).toBeInTheDocument();
  });

  it('shows the section heading', () => {
    render(<CostSummary totalCost={1.25} totalPremiumRequests={0} />);
    expect(screen.getByText('Usage Cost')).toBeInTheDocument();
  });

  it('displays premium requests when present', () => {
    render(<CostSummary totalCost={0} totalPremiumRequests={5} />);
    expect(screen.getByTestId('total-premium-requests')).toHaveTextContent('5.0 reqs');
  });

  it('displays both cost and premium requests when both nonzero', () => {
    render(<CostSummary totalCost={2.5} totalPremiumRequests={3} />);
    expect(screen.getByTestId('total-premium-requests')).toHaveTextContent('3.0 reqs');
    expect(screen.getByTestId('total-cost')).toHaveTextContent('$2.50');
  });
});
