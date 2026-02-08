import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolAuditLog } from './ToolAuditLog';

vi.mock('@/api/hooks/useSecurity', () => ({
  useDeniedCalls: vi.fn(),
}));

import { useDeniedCalls } from '@/api/hooks/useSecurity';
const mockUseDeniedCalls = vi.mocked(useDeniedCalls);

describe('ToolAuditLog', () => {
  it('shows empty state when no denied calls', () => {
    mockUseDeniedCalls.mockReturnValue({
      isLoading: false,
      data: { entries: [] },
    } as unknown as ReturnType<typeof useDeniedCalls>);
    render(<ToolAuditLog />);
    expect(screen.getByTestId('audit-empty')).toHaveTextContent('No denied tool calls');
  });

  it('renders denied entries with tool name and agent', () => {
    mockUseDeniedCalls.mockReturnValue({
      isLoading: false,
      data: {
        entries: [
          {
            id: 'a1',
            agentId: 'researcher',
            toolName: 'bash_execute',
            args: '{}',
            result: 'denied',
            isError: false,
            permitted: false,
            denialReason: 'Tool is dangerous',
            durationMs: 0,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    } as unknown as ReturnType<typeof useDeniedCalls>);
    render(<ToolAuditLog />);
    expect(screen.getByTestId('audit-log')).toBeInTheDocument();
    expect(screen.getByText('bash_execute')).toBeInTheDocument();
    expect(screen.getByText('Agent: researcher')).toBeInTheDocument();
    expect(screen.getByText('Tool is dangerous')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseDeniedCalls.mockReturnValue({
      isLoading: true,
      data: undefined,
    } as unknown as ReturnType<typeof useDeniedCalls>);
    render(<ToolAuditLog />);
    expect(screen.getByText('Loading audit log...')).toBeInTheDocument();
  });
});
