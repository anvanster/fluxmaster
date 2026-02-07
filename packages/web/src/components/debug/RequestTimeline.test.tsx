import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequestTimeline } from './RequestTimeline';
import type { RequestDetailResponse } from '@fluxmaster/api-types';

function makeRequest(overrides?: Partial<RequestDetailResponse>): RequestDetailResponse {
  return {
    id: 'req-1',
    agentId: 'default',
    conversationId: 'conv-1',
    status: 'completed',
    startedAt: '2025-01-01T00:00:00.000Z',
    firstTokenAt: '2025-01-01T00:00:00.350Z',
    completedAt: '2025-01-01T00:00:02.500Z',
    inputTokens: 1500,
    outputTokens: 800,
    iterations: 1,
    toolCalls: [],
    ttftMs: 350,
    totalDurationMs: 2500,
    ...overrides,
  };
}

describe('RequestTimeline', () => {
  it('renders agent id and status', () => {
    render(<RequestTimeline request={makeRequest()} />);
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('renders TTFT and total duration metrics', () => {
    render(<RequestTimeline request={makeRequest()} />);
    expect(screen.getByText('TTFT')).toBeInTheDocument();
    // There are two 350ms: one in metrics, one in waterfall
    const ttfts = screen.getAllByText('350ms');
    expect(ttfts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2.5s').length).toBeGreaterThanOrEqual(1);
  });

  it('renders token counts', () => {
    render(<RequestTimeline request={makeRequest()} />);
    expect(screen.getByText('1.5K')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
  });

  it('renders tool call bars', () => {
    render(
      <RequestTimeline
        request={makeRequest({
          toolCalls: [
            { toolName: 'read_file', startedAt: '2025-01-01T00:00:00.500Z', completedAt: '2025-01-01T00:00:01.200Z', durationMs: 700, isError: false },
            { toolName: 'write_file', startedAt: '2025-01-01T00:00:01.300Z', completedAt: '2025-01-01T00:00:01.800Z', durationMs: 500, isError: false },
          ],
        })}
      />,
    );
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('write_file')).toBeInTheDocument();
    expect(screen.getAllByTestId('tool-call-bar')).toHaveLength(2);
  });

  it('renders error message', () => {
    render(
      <RequestTimeline
        request={makeRequest({ status: 'error', errorMessage: 'Rate limit exceeded' })}
      />,
    );
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });
});
