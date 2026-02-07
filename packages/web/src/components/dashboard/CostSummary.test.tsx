import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostSummary } from './CostSummary';

describe('CostSummary', () => {
  it('displays total cost', () => {
    render(<CostSummary totalCost={7.5} />);
    expect(screen.getByText('$7.50')).toBeInTheDocument();
  });

  it('shows <$0.01 for zero cost', () => {
    render(<CostSummary totalCost={0} />);
    expect(screen.getByText('<$0.01')).toBeInTheDocument();
  });

  it('shows the section heading', () => {
    render(<CostSummary totalCost={1.25} />);
    expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
  });
});
