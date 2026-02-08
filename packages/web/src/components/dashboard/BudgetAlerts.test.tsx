import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetAlerts } from './BudgetAlerts';
import type { BudgetAlertResponse } from '@fluxmaster/api-types';

describe('BudgetAlerts', () => {
  const makeAlert = (overrides?: Partial<BudgetAlertResponse>): BudgetAlertResponse => ({
    id: 'a1',
    budgetId: 'global',
    type: 'warning',
    unit: 'cost',
    threshold: 0.8,
    currentCost: 80,
    maxCost: 100,
    timestamp: '2024-06-15T12:00:00Z',
    ...overrides,
  });

  it('shows alert type and budget id', () => {
    render(<BudgetAlerts alerts={[makeAlert()]} />);
    expect(screen.getByText('warning')).toBeInTheDocument();
    expect(screen.getByText('global')).toBeInTheDocument();
  });

  it('shows exceeded alert differently', () => {
    render(<BudgetAlerts alerts={[makeAlert({ type: 'exceeded', threshold: 1 })]} />);
    expect(screen.getByText('exceeded')).toBeInTheDocument();
  });

  it('shows empty state when no alerts', () => {
    render(<BudgetAlerts alerts={[]} />);
    expect(screen.getByText('No budget alerts')).toBeInTheDocument();
  });

  it('formats cost unit as dollars', () => {
    render(<BudgetAlerts alerts={[makeAlert({ currentCost: 80, maxCost: 100, unit: 'cost' })]} />);
    expect(screen.getByText('$80.00 / $100.00')).toBeInTheDocument();
  });

  it('formats premium_requests unit as reqs', () => {
    render(<BudgetAlerts alerts={[makeAlert({ currentCost: 150, maxCost: 300, unit: 'premium_requests' })]} />);
    expect(screen.getByText('150.0 reqs / 300.0 reqs')).toBeInTheDocument();
  });
});
