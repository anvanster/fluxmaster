import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateAgentModal } from './CreateAgentModal';
import { AGENT_TEMPLATES } from '@/data/agent-templates';

const mockMutate = vi.fn();

vi.mock('@/api/hooks/useAgents', () => ({
  useSpawnAgent: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  })),
}));

vi.mock('@/api/hooks/useModels', () => ({
  useModels: vi.fn(() => ({
    data: [
      { id: 'gpt-4o', provider: 'openai', premiumMultiplier: 0 },
      { id: 'claude-sonnet-4', provider: 'anthropic', premiumMultiplier: 1 },
    ],
  })),
}));

vi.mock('@/api/hooks/useTools', () => ({
  useTools: vi.fn(() => ({
    data: [
      { name: 'web_search', description: 'Search the web' },
      { name: 'read_file', description: 'Read files' },
      { name: 'delegate_to_agent', description: 'Delegate to agent' },
    ],
  })),
}));

describe('CreateAgentModal', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('does not render when closed', () => {
    render(<CreateAgentModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('template-picker')).not.toBeInTheDocument();
  });

  it('shows template picker on open', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('template-picker')).toBeInTheDocument();
  });

  it('renders all 12 template cards', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    const cards = screen.getAllByTestId('template-card');
    expect(cards).toHaveLength(12);
  });

  it('shows template names', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Coordinator')).toBeInTheDocument();
    expect(screen.getByText('Coder')).toBeInTheDocument();
    expect(screen.getByText('Reviewer')).toBeInTheDocument();
    expect(screen.getByText('Custom Agent')).toBeInTheDocument();
  });

  it('advances to config form when template selected', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    const cards = screen.getAllByTestId('template-card');
    fireEvent.click(cards[0]); // Click Coordinator
    expect(screen.queryByTestId('template-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-config-form')).toBeInTheDocument();
  });

  it('pre-fills ID from template', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    const cards = screen.getAllByTestId('template-card');
    fireEvent.click(cards[0]); // Coordinator
    const idInput = screen.getByTestId('agent-id-input') as HTMLInputElement;
    expect(idInput.value).toBe('coordinator');
  });

  it('pre-fills persona name from template', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    const cards = screen.getAllByTestId('template-card');
    fireEvent.click(cards[0]); // Coordinator
    const nameInput = screen.getByTestId('persona-name-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Coordinator');
  });

  it('back button returns to template picker', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    const cards = screen.getAllByTestId('template-card');
    fireEvent.click(cards[0]);
    expect(screen.getByTestId('agent-config-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(screen.getByTestId('template-picker')).toBeInTheDocument();
  });

  it('disables spawn button when ID is empty', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    // Select custom template (empty ID)
    const cards = screen.getAllByTestId('template-card');
    fireEvent.click(cards[cards.length - 1]); // Custom Agent (last)
    expect(screen.getByTestId('spawn-agent-btn')).toBeDisabled();
  });

  it('calls mutate with persona data on spawn', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    const cards = screen.getAllByTestId('template-card');
    fireEvent.click(cards[0]); // Coordinator

    // Select a model
    fireEvent.change(screen.getByTestId('agent-model-select'), { target: { value: 'gpt-4o' } });

    fireEvent.click(screen.getByTestId('spawn-agent-btn'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    const arg = mockMutate.mock.calls[0][0];
    expect(arg.id).toBe('coordinator');
    expect(arg.model).toBe('gpt-4o');
    expect(arg.persona).toBeDefined();
    expect(arg.persona.identity.name).toBe('Coordinator');
    expect(arg.persona.soul.coreTraits).toContain('strategic');
  });

  it('closes modal after spawn', () => {
    const onClose = vi.fn();
    render(<CreateAgentModal open={true} onClose={onClose} />);
    const cards = screen.getAllByTestId('template-card');
    fireEvent.click(cards[0]);
    fireEvent.change(screen.getByTestId('agent-model-select'), { target: { value: 'gpt-4o' } });
    fireEvent.click(screen.getByTestId('spawn-agent-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows model dropdown with options', () => {
    render(<CreateAgentModal open={true} onClose={vi.fn()} />);
    const cards = screen.getAllByTestId('template-card');
    fireEvent.click(cards[0]);
    const select = screen.getByTestId('agent-model-select') as HTMLSelectElement;
    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(3); // placeholder + 2 models
  });
});
