import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentList } from './AgentList';

vi.mock('@/api/hooks/useAgents', () => ({
  useAgents: vi.fn(() => ({
    data: [
      {
        id: 'coordinator',
        model: 'gpt-4o',
        status: 'idle',
        tools: ['delegate_to_agent', 'web_search'],
        systemPrompt: 'You are a coordinator.',
        temperature: 0.7,
        maxTokens: 8192,
      },
      {
        id: 'coder',
        model: 'claude-sonnet-4',
        status: 'processing',
        tools: [],
        temperature: 0.5,
        maxTokens: 16384,
      },
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

  it('renders each agent with id, model, and provider badge', () => {
    renderWithQuery(<AgentList />);
    const items = screen.getAllByTestId('agent-list-item');
    expect(items).toHaveLength(2);
    expect(screen.getByText('coordinator')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('coder')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4')).toBeInTheDocument();
    // Provider badges
    const badges = screen.getAllByTestId('provider-badge');
    expect(badges[0]).toHaveTextContent('OpenAI');
    expect(badges[1]).toHaveTextContent('Anthropic');
  });

  it('shows tool count for agents with tools', () => {
    renderWithQuery(<AgentList />);
    const toolCounts = screen.getAllByTestId('tool-count');
    expect(toolCounts).toHaveLength(1); // only coordinator has tools
    expect(toolCounts[0]).toHaveTextContent('2');
  });

  it('expands agent to show details', () => {
    renderWithQuery(<AgentList />);
    expect(screen.queryByTestId('details-coordinator')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('expand-coordinator'));
    expect(screen.getByTestId('details-coordinator')).toBeInTheDocument();
    expect(screen.getByText('You are a coordinator.')).toBeInTheDocument();
    expect(screen.getByText('delegate_to_agent')).toBeInTheDocument();
    expect(screen.getByText('web_search')).toBeInTheDocument();
    expect(screen.getByText('0.7')).toBeInTheDocument();
    expect(screen.getByText('8,192')).toBeInTheDocument();
  });

  it('renders kill button for each agent', () => {
    renderWithQuery(<AgentList />);
    expect(screen.getByLabelText('Kill agent coordinator')).toBeInTheDocument();
    expect(screen.getByLabelText('Kill agent coder')).toBeInTheDocument();
  });

  it('shows empty state when no agents', async () => {
    const { useAgents } = await import('@/api/hooks/useAgents');
    (useAgents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], isLoading: false });
    renderWithQuery(<AgentList />);
    expect(screen.getByText('No agents running')).toBeInTheDocument();
  });
});
