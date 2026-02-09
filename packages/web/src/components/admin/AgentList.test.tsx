import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentList } from './AgentList';

const coordinatorPersona = {
  identity: { name: 'Coordinator', role: 'orchestration lead', emoji: '🎯' },
  soul: {
    coreTraits: ['strategic', 'delegation-oriented', 'analytical'],
    decisionFramework: 'Break complex tasks into specialist subtasks.',
    priorities: ['task decomposition', 'specialist selection'],
  },
  toolPreferences: {
    preferred: ['delegate_to_agent'],
    avoided: ['bash_execute'],
  },
  memoryProtocol: {
    shouldRemember: ['delegation outcomes'],
    recallTriggers: ['new task assignment'],
    maxRecallEntries: 15,
  },
  autonomy: {
    canSelfAssign: true,
    maxGoalIterations: 8,
    reflectionEnabled: true,
    autoDecompose: true,
    confidenceThreshold: 0.7,
  },
};

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
        persona: coordinatorPersona,
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

  it('renders agent cards in grid layout', () => {
    renderWithQuery(<AgentList />);
    const items = screen.getAllByTestId('agent-list-item');
    expect(items).toHaveLength(2);
  });

  it('shows persona name and emoji for agents with persona', () => {
    renderWithQuery(<AgentList />);
    expect(screen.getByText('Coordinator')).toBeInTheDocument();
    expect(screen.getByText('orchestration lead')).toBeInTheDocument();
  });

  it('falls back to agent ID when no persona', () => {
    renderWithQuery(<AgentList />);
    expect(screen.getByText('coder')).toBeInTheDocument();
  });

  it('shows provider badges', () => {
    renderWithQuery(<AgentList />);
    const badges = screen.getAllByTestId('provider-badge');
    expect(badges[0]).toHaveTextContent('OpenAI');
    expect(badges[1]).toHaveTextContent('Anthropic');
  });

  it('shows trait badges for agents with persona', () => {
    renderWithQuery(<AgentList />);
    expect(screen.getByText('strategic')).toBeInTheDocument();
    expect(screen.getByText('delegation-oriented')).toBeInTheDocument();
    expect(screen.getByText('analytical')).toBeInTheDocument();
  });

  it('shows tool count for agents with tools', () => {
    renderWithQuery(<AgentList />);
    const toolCounts = screen.getAllByTestId('tool-count');
    expect(toolCounts).toHaveLength(1);
    expect(toolCounts[0]).toHaveTextContent('2 tools');
  });

  it('shows autonomy indicator for autonomous agents', () => {
    renderWithQuery(<AgentList />);
    expect(screen.getByTestId('autonomy-indicator')).toBeInTheDocument();
  });

  it('shows memory indicator for agents with memory protocol', () => {
    renderWithQuery(<AgentList />);
    expect(screen.getByTestId('memory-indicator')).toBeInTheDocument();
  });

  it('opens drawer when card is clicked', () => {
    renderWithQuery(<AgentList />);
    expect(screen.queryByTestId('agent-drawer')).not.toBeInTheDocument();
    const items = screen.getAllByTestId('agent-list-item');
    fireEvent.click(items[0]);
    expect(screen.getByTestId('agent-drawer')).toBeInTheDocument();
  });

  it('closes drawer when close button clicked', () => {
    renderWithQuery(<AgentList />);
    const items = screen.getAllByTestId('agent-list-item');
    fireEvent.click(items[0]);
    expect(screen.getByTestId('agent-drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(screen.queryByTestId('agent-drawer')).not.toBeInTheDocument();
  });

  it('shows empty state when no agents', async () => {
    const { useAgents } = await import('@/api/hooks/useAgents');
    (useAgents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], isLoading: false });
    renderWithQuery(<AgentList />);
    expect(screen.getByText('No agents running')).toBeInTheDocument();
  });
});
