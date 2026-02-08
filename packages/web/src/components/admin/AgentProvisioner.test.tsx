import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentProvisioner } from './AgentProvisioner';

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
      { id: 'gpt-5', provider: 'openai', premiumMultiplier: 1 },
      { id: 'claude-sonnet-4', provider: 'anthropic', premiumMultiplier: 1 },
      { id: 'claude-haiku-4.5', provider: 'anthropic', premiumMultiplier: 0.33 },
    ],
  })),
}));

vi.mock('@/api/hooks/useTools', () => ({
  useTools: vi.fn(() => ({
    data: [
      { name: 'web_search', description: 'Search the web' },
      { name: 'file_reader', description: 'Read files' },
      { name: 'delegate_to_agent', description: 'Delegate to another agent' },
    ],
  })),
}));

describe('AgentProvisioner', () => {
  it('renders spawn form with all fields', () => {
    render(<AgentProvisioner />);
    expect(screen.getByTestId('agent-provisioner')).toBeInTheDocument();
    expect(screen.getByTestId('agent-id-input')).toBeInTheDocument();
    expect(screen.getByTestId('agent-model-select')).toBeInTheDocument();
    expect(screen.getByTestId('agent-system-prompt')).toBeInTheDocument();
    expect(screen.getByTestId('tool-selector')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-toggle')).toBeInTheDocument();
  });

  it('populates model dropdown with grouped options', () => {
    render(<AgentProvisioner />);
    const select = screen.getByTestId('agent-model-select') as HTMLSelectElement;
    // Should have optgroups for openai and anthropic
    const optgroups = select.querySelectorAll('optgroup');
    expect(optgroups.length).toBe(2);
    // Should have 4 model options + 1 placeholder
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(5); // placeholder + 4 models
  });

  it('shows tool checkboxes', () => {
    render(<AgentProvisioner />);
    expect(screen.getByTestId('tool-checkbox-web_search')).toBeInTheDocument();
    expect(screen.getByTestId('tool-checkbox-file_reader')).toBeInTheDocument();
    expect(screen.getByTestId('tool-checkbox-delegate_to_agent')).toBeInTheDocument();
  });

  it('shows cost badge when model selected', () => {
    render(<AgentProvisioner />);
    fireEvent.change(screen.getByTestId('agent-model-select'), { target: { value: 'gpt-4o' } });
    expect(screen.getByTestId('model-cost-badge')).toHaveTextContent('free premium');
  });

  it('toggles advanced section', () => {
    render(<AgentProvisioner />);
    expect(screen.queryByTestId('advanced-section')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('advanced-toggle'));
    expect(screen.getByTestId('advanced-section')).toBeInTheDocument();
    expect(screen.getByTestId('temperature-slider')).toBeInTheDocument();
    expect(screen.getByTestId('max-tokens-input')).toBeInTheDocument();
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('0.7');
  });

  it('disables spawn button when required fields empty', () => {
    render(<AgentProvisioner />);
    expect(screen.getByRole('button', { name: 'Spawn Agent' })).toBeDisabled();
  });

  it('enables spawn button when id and model filled', () => {
    render(<AgentProvisioner />);
    fireEvent.change(screen.getByTestId('agent-id-input'), { target: { value: 'test-agent' } });
    fireEvent.change(screen.getByTestId('agent-model-select'), { target: { value: 'gpt-4o' } });
    expect(screen.getByRole('button', { name: 'Spawn Agent' })).not.toBeDisabled();
  });

  it('calls mutate with full config on spawn', () => {
    render(<AgentProvisioner />);
    fireEvent.change(screen.getByTestId('agent-id-input'), { target: { value: 'my-agent' } });
    fireEvent.change(screen.getByTestId('agent-model-select'), { target: { value: 'claude-sonnet-4' } });
    fireEvent.change(screen.getByTestId('agent-system-prompt'), { target: { value: 'Be helpful' } });
    fireEvent.click(screen.getByTestId('tool-checkbox-web_search'));
    fireEvent.click(screen.getByRole('button', { name: 'Spawn Agent' }));
    expect(mockMutate).toHaveBeenCalledWith({
      id: 'my-agent',
      model: 'claude-sonnet-4',
      systemPrompt: 'Be helpful',
      tools: ['web_search'],
      temperature: 0.7,
      maxTokens: 8192,
    });
  });

  it('resets form after spawn', () => {
    render(<AgentProvisioner />);
    fireEvent.change(screen.getByTestId('agent-id-input'), { target: { value: 'my-agent' } });
    fireEvent.change(screen.getByTestId('agent-model-select'), { target: { value: 'gpt-4o' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spawn Agent' }));
    expect((screen.getByTestId('agent-id-input') as HTMLInputElement).value).toBe('');
    expect((screen.getByTestId('agent-model-select') as HTMLSelectElement).value).toBe('');
  });
});
