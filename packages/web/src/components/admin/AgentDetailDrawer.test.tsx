import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentDetailDrawer } from './AgentDetailDrawer';
import type { AgentInfoResponse } from '@fluxmaster/api-types';

const baseAgent: AgentInfoResponse = {
  id: 'coordinator',
  model: 'claude-sonnet-4',
  status: 'idle',
  tools: ['delegate_to_agent', 'fan_out', 'read_file'],
  systemPrompt: 'You are a coordinator.',
  temperature: 0.7,
  maxTokens: 8192,
};

const agentWithPersona: AgentInfoResponse = {
  ...baseAgent,
  persona: {
    identity: { name: 'Coordinator', role: 'orchestration lead', emoji: '🎯' },
    soul: {
      coreTraits: ['strategic', 'delegation-oriented', 'analytical'],
      decisionFramework: 'Break complex tasks into specialist subtasks.',
      priorities: ['task decomposition', 'specialist selection', 'result synthesis'],
      communicationStyle: 'concise, structured',
      guidelines: ['Check memory before delegating', 'Save decisions for future reference'],
    },
    toolPreferences: {
      preferred: ['delegate_to_agent', 'fan_out'],
      avoided: ['bash_execute', 'write_file'],
      usageHints: { delegate_to_agent: 'For sequential tasks' },
    },
    memoryProtocol: {
      shouldRemember: ['delegation outcomes', 'error patterns'],
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
  },
};

describe('AgentDetailDrawer', () => {
  it('does not render when no agent is provided', () => {
    render(<AgentDetailDrawer agent={null} onClose={vi.fn()} onKill={vi.fn()} />);
    expect(screen.queryByTestId('agent-drawer')).not.toBeInTheDocument();
  });

  it('renders drawer with persona identity header', () => {
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={vi.fn()} onKill={vi.fn()} />);
    expect(screen.getByTestId('agent-drawer')).toBeInTheDocument();
    expect(screen.getByText('Coordinator')).toBeInTheDocument();
    expect(screen.getByText('orchestration lead')).toBeInTheDocument();
  });

  it('renders soul section with traits and priorities', () => {
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={vi.fn()} onKill={vi.fn()} />);
    expect(screen.getByText('strategic')).toBeInTheDocument();
    expect(screen.getByText('delegation-oriented')).toBeInTheDocument();
    expect(screen.getByText('analytical')).toBeInTheDocument();
    expect(screen.getByText('Break complex tasks into specialist subtasks.')).toBeInTheDocument();
    expect(screen.getByText('task decomposition')).toBeInTheDocument();
  });

  it('renders tool preferences section', () => {
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={vi.fn()} onKill={vi.fn()} />);
    expect(screen.getByTestId('preferred-tools')).toBeInTheDocument();
    expect(screen.getByTestId('avoided-tools')).toBeInTheDocument();
  });

  it('renders memory protocol section', () => {
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={vi.fn()} onKill={vi.fn()} />);
    expect(screen.getByText('delegation outcomes')).toBeInTheDocument();
    expect(screen.getByText('new task assignment')).toBeInTheDocument();
  });

  it('renders autonomy section', () => {
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={vi.fn()} onKill={vi.fn()} />);
    expect(screen.getByTestId('autonomy-section')).toBeInTheDocument();
    expect(screen.getByText('Self-assign')).toBeInTheDocument();
  });

  it('renders fallback view when no persona', () => {
    render(<AgentDetailDrawer agent={baseAgent} onClose={vi.fn()} onKill={vi.fn()} />);
    expect(screen.getByTestId('agent-drawer')).toBeInTheDocument();
    // Should show agent ID as header
    expect(screen.getByText('coordinator')).toBeInTheDocument();
    // Should show system prompt
    expect(screen.getByText('You are a coordinator.')).toBeInTheDocument();
  });

  it('renders configuration section (collapsed by default when persona present)', () => {
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={vi.fn()} onKill={vi.fn()} />);
    // Config section is collapsed when persona exists — verify the section header exists
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    // read_file only appears in config section, and it's collapsed
    expect(screen.queryByText('read_file')).not.toBeInTheDocument();
    // Expand it
    fireEvent.click(screen.getByText('Configuration'));
    expect(screen.getByText('read_file')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={onClose} onKill={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={onClose} onKill={vi.fn()} />);
    fireEvent.click(screen.getByTestId('drawer-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on escape key', () => {
    const onClose = vi.fn();
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={onClose} onKill={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onKill when kill button clicked', () => {
    const onKill = vi.fn();
    render(<AgentDetailDrawer agent={agentWithPersona} onClose={vi.fn()} onKill={onKill} />);
    fireEvent.click(screen.getByTestId('kill-agent-btn'));
    expect(onKill).toHaveBeenCalledWith('coordinator');
  });
});
