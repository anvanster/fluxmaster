import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetProgress } from './BudgetProgress';
import type { BudgetStatusResponse } from '@fluxmaster/api-types';

describe('BudgetProgress', () => {
  const makeBudget = (overrides?: Partial<BudgetStatusResponse>): BudgetStatusResponse => ({
    id: 'global',
    period: 'monthly',
    unit: 'cost',
    maxCost: 100,
    currentCost: 60,
    percentage: 0.6,
    exceeded: false,
    warningThresholds: [0.8, 0.9],
    triggeredThresholds: [],
    ...overrides,
  });

  it('displays budget id and period', () => {
    render(<BudgetProgress budgets={[makeBudget()]} />);
    expect(screen.getByText('global')).toBeInTheDocument();
    expect(screen.getByText('monthly')).toBeInTheDocument();
  });

  it('shows cost as current/max', () => {
    render(<BudgetProgress budgets={[makeBudget({ currentCost: 60, maxCost: 100 })]} />);
    expect(screen.getByText('$60.00 / $100.00')).toBeInTheDocument();
  });

  it('shows exceeded state', () => {
    render(<BudgetProgress budgets={[makeBudget({ exceeded: true, currentCost: 101, maxCost: 100, percentage: 1.01 })]} />);
    expect(screen.getByText('Exceeded')).toBeInTheDocument();
  });

  it('formats premium_requests unit as reqs', () => {
    render(<BudgetProgress budgets={[makeBudget({ currentCost: 150, maxCost: 300, unit: 'premium_requests' })]} />);
    expect(screen.getByText('150.0 reqs / 300.0 reqs')).toBeInTheDocument();
  });
});
