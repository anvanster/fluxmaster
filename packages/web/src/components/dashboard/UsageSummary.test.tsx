import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageSummary } from './UsageSummary';

describe('UsageSummary', () => {
  it('renders token counts', () => {
    render(<UsageSummary inputTokens={1500} outputTokens={750} requestCount={5} />);
    expect(screen.getByText('1.5K')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('has correct test id', () => {
    render(<UsageSummary inputTokens={0} outputTokens={0} requestCount={0} />);
    expect(screen.getByTestId('usage-summary')).toBeInTheDocument();
  });
});
