import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolPermissions } from './ToolPermissions';

vi.mock('@/api/hooks/useSecurity', () => ({
  useSecurityPolicy: vi.fn(),
}));

import { useSecurityPolicy } from '@/api/hooks/useSecurity';
const mockUseSecurityPolicy = vi.mocked(useSecurityPolicy);

describe('ToolPermissions', () => {
  it('shows default level', () => {
    mockUseSecurityPolicy.mockReturnValue({
      isLoading: false,
      data: {
        policy: {
          defaultLevel: 'restricted',
          toolLevels: {},
          agentPermissions: {},
        },
      },
    } as unknown as ReturnType<typeof useSecurityPolicy>);
    render(<ToolPermissions />);
    expect(screen.getByTestId('default-level')).toHaveTextContent('restricted');
  });

  it('renders tool levels', () => {
    mockUseSecurityPolicy.mockReturnValue({
      isLoading: false,
      data: {
        policy: {
          defaultLevel: 'restricted',
          toolLevels: { bash_execute: 'dangerous', write_file: 'restricted' },
          agentPermissions: {},
        },
      },
    } as unknown as ReturnType<typeof useSecurityPolicy>);
    render(<ToolPermissions />);
    const levels = screen.getAllByTestId('tool-level');
    expect(levels).toHaveLength(2);
    expect(screen.getByText('bash_execute')).toBeInTheDocument();
    expect(screen.getByText('dangerous')).toBeInTheDocument();
  });

  it('renders agent permissions', () => {
    mockUseSecurityPolicy.mockReturnValue({
      isLoading: false,
      data: {
        policy: {
          defaultLevel: 'restricted',
          toolLevels: {},
          agentPermissions: {
            researcher: { allowlist: ['read_file'], maxCallsPerMinute: 30 },
          },
        },
      },
    } as unknown as ReturnType<typeof useSecurityPolicy>);
    render(<ToolPermissions />);
    expect(screen.getByTestId('agent-permission')).toBeInTheDocument();
    expect(screen.getByText('researcher')).toBeInTheDocument();
    expect(screen.getByText('Allow: read_file')).toBeInTheDocument();
    expect(screen.getByText('Rate: 30/min')).toBeInTheDocument();
  });
});
