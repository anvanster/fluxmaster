import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemHealth } from './SystemHealth';

describe('SystemHealth', () => {
  it('shows healthy status', () => {
    render(<SystemHealth status="ok" uptime={3700} />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('1h 1m')).toBeInTheDocument();
  });

  it('shows error status', () => {
    render(<SystemHealth status="error" uptime={0} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
