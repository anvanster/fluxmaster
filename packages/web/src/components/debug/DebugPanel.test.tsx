import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DebugPanel } from './DebugPanel';
import { useDebugStore } from '@/stores/debug-store';
import { useChatStore } from '@/stores/chat-store';

vi.mock('@/api/hooks/useRequests', () => {
  const requests = [
    {
      id: 'req-1', agentId: 'default', conversationId: 'conv-1', status: 'completed',
      startedAt: '2025-01-01T00:00:00.000Z', firstTokenAt: '2025-01-01T00:00:00.350Z',
      completedAt: '2025-01-01T00:00:02.500Z', inputTokens: 100, outputTokens: 50,
      iterations: 1, toolCalls: [], ttftMs: 350, totalDurationMs: 2500,
    },
    {
      id: 'req-2', agentId: 'default', conversationId: 'conv-1', status: 'error',
      startedAt: '2025-01-01T00:00:03.000Z', inputTokens: 50, toolCalls: [],
      errorMessage: 'Timeout', ttftMs: null, totalDurationMs: null,
    },
  ];
  return {
    useRequestHistory: () => ({ data: { requests }, isLoading: false }),
    useRequestDetail: (id: string | null) => ({
      data: id ? requests.find((r) => r.id === id) : undefined,
      isLoading: false,
    }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe('DebugPanel', () => {
  beforeEach(() => {
    useDebugStore.setState({ debugPanelOpen: true, selectedRequestId: null });
    useChatStore.setState({ activeAgentId: 'default', conversations: new Map(), streaming: new Map() });
  });

  it('renders the debug panel with request list', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByTestId('debug-panel')).toBeInTheDocument();
    expect(screen.getByTestId('request-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('request-list-item')).toHaveLength(2);
  });

  it('shows placeholder when no request is selected', () => {
    renderWithProviders(<DebugPanel />);
    expect(screen.getByText('Select a request to view details')).toBeInTheDocument();
  });

  it('shows timeline when a request is selected', () => {
    useDebugStore.setState({ selectedRequestId: 'req-1' });
    renderWithProviders(<DebugPanel />);
    expect(screen.getByTestId('request-timeline')).toBeInTheDocument();
  });

  it('selects request on click', () => {
    renderWithProviders(<DebugPanel />);
    const items = screen.getAllByTestId('request-list-item');
    fireEvent.click(items[0]);
    expect(useDebugStore.getState().selectedRequestId).toBe('req-1');
  });

  it('closes panel when close button is clicked', () => {
    renderWithProviders(<DebugPanel />);
    fireEvent.click(screen.getByLabelText('Close debug panel'));
    expect(useDebugStore.getState().debugPanelOpen).toBe(false);
  });
});
