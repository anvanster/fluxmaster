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

describe('AgentProvisioner', () => {
  it('renders spawn form', () => {
    render(<AgentProvisioner />);
    expect(screen.getByTestId('agent-provisioner')).toBeInTheDocument();
    expect(screen.getByTestId('agent-id-input')).toBeInTheDocument();
    expect(screen.getByTestId('agent-model-input')).toBeInTheDocument();
  });

  it('disables spawn button when fields empty', () => {
    render(<AgentProvisioner />);
    expect(screen.getByRole('button', { name: 'Spawn' })).toBeDisabled();
  });

  it('enables spawn button when fields filled', () => {
    render(<AgentProvisioner />);
    fireEvent.change(screen.getByTestId('agent-id-input'), { target: { value: 'test-agent' } });
    fireEvent.change(screen.getByTestId('agent-model-input'), { target: { value: 'gpt-4o' } });
    expect(screen.getByRole('button', { name: 'Spawn' })).not.toBeDisabled();
  });

  it('calls mutate on spawn', () => {
    render(<AgentProvisioner />);
    fireEvent.change(screen.getByTestId('agent-id-input'), { target: { value: 'test-agent' } });
    fireEvent.change(screen.getByTestId('agent-model-input'), { target: { value: 'gpt-4o' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spawn' }));
    expect(mockMutate).toHaveBeenCalledWith({ id: 'test-agent', model: 'gpt-4o', tools: [] });
  });
});
