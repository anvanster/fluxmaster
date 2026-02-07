import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentList } from './AgentList';

vi.mock('@/api/hooks/useAgents', () => ({
  useAgents: vi.fn(() => ({
    data: [
      { id: 'default', model: 'gpt-4o', status: 'idle' },
      { id: 'coder', model: 'claude-sonnet-4', status: 'processing' },
    ],
    isLoading: false,
  })),
  useKillAgent: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AgentList', () => {
  it('renders agent list with count badge', () => {
    renderWithQuery(<AgentList />);
    expect(screen.getByTestId('agent-list')).toBeInTheDocument();
    expect(screen.getByTestId('agent-count')).toHaveTextContent('2');
  });

  it('renders each agent with id and model', () => {
    renderWithQuery(<AgentList />);
    const items = screen.getAllByTestId('agent-list-item');
    expect(items).toHaveLength(2);
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('(gpt-4o)')).toBeInTheDocument();
    expect(screen.getByText('coder')).toBeInTheDocument();
    expect(screen.getByText('(claude-sonnet-4)')).toBeInTheDocument();
  });

  it('renders kill button for each agent', () => {
    renderWithQuery(<AgentList />);
    expect(screen.getByLabelText('Kill agent default')).toBeInTheDocument();
    expect(screen.getByLabelText('Kill agent coder')).toBeInTheDocument();
  });

  it('shows empty state when no agents', async () => {
    const { useAgents } = await import('@/api/hooks/useAgents');
    (useAgents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], isLoading: false });
    renderWithQuery(<AgentList />);
    expect(screen.getByText('No agents running')).toBeInTheDocument();
  });
});
