import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentProvisioner } from './AgentProvisioner';

vi.mock('@/api/hooks/useAgents', () => ({
  useSpawnAgent: vi.fn(() => ({
    mutate: vi.fn(),
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
    ],
  })),
}));

describe('AgentProvisioner', () => {
  it('renders Create Agent button', () => {
    render(<AgentProvisioner />);
    expect(screen.getByTestId('create-agent-btn')).toBeInTheDocument();
    expect(screen.getByTestId('create-agent-btn')).toHaveTextContent('Create Agent');
  });

  it('does not show modal initially', () => {
    render(<AgentProvisioner />);
    expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();
  });

  it('opens modal when button clicked', () => {
    render(<AgentProvisioner />);
    fireEvent.click(screen.getByTestId('create-agent-btn'));
    expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('template-picker')).toBeInTheDocument();
  });

  it('closes modal on backdrop click', () => {
    render(<AgentProvisioner />);
    fireEvent.click(screen.getByTestId('create-agent-btn'));
    expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();
  });
});
