import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RequestListItem } from './RequestListItem';
import type { RequestDetailResponse } from '@fluxmaster/api-types';

function makeRequest(overrides?: Partial<RequestDetailResponse>): RequestDetailResponse {
  return {
    id: 'req-1',
    agentId: 'default',
    conversationId: 'conv-1',
    status: 'completed',
    startedAt: '2025-01-01T00:00:00.000Z',
    completedAt: '2025-01-01T00:00:02.500Z',
    inputTokens: 100,
    outputTokens: 50,
    iterations: 1,
    toolCalls: [],
    ttftMs: 350,
    totalDurationMs: 2500,
    ...overrides,
  };
}

describe('RequestListItem', () => {
  it('renders agent id and timing', () => {
    render(<RequestListItem request={makeRequest()} isSelected={false} onClick={() => {}} />);
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('350ms')).toBeInTheDocument();
    expect(screen.getByText('2.5s')).toBeInTheDocument();
  });

  it('shows selected state', () => {
    render(<RequestListItem request={makeRequest()} isSelected={true} onClick={() => {}} />);
    const btn = screen.getByTestId('request-list-item');
    expect(btn.className).toContain('border-blue-500');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<RequestListItem request={makeRequest()} isSelected={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('request-list-item'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
