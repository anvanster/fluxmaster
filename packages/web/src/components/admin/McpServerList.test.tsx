import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { McpServerList } from './McpServerList';

vi.mock('@/api/hooks/useMcp', () => ({
  useMcpServers: vi.fn(),
  useStartMcpServer: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useStopMcpServer: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import { useMcpServers } from '@/api/hooks/useMcp';
const mockUseMcpServers = vi.mocked(useMcpServers);

describe('McpServerList', () => {
  it('shows empty state when no servers configured', () => {
    mockUseMcpServers.mockReturnValue({
      isLoading: false,
      data: { configured: [], running: [] },
    } as ReturnType<typeof useMcpServers>);
    render(<McpServerList />);
    expect(screen.getByText('No MCP servers configured')).toBeInTheDocument();
  });

  it('renders server cards', () => {
    mockUseMcpServers.mockReturnValue({
      isLoading: false,
      data: {
        configured: [{ name: 'github', transport: 'stdio', command: 'npx mcp' }],
        running: ['github'],
      },
    } as ReturnType<typeof useMcpServers>);
    render(<McpServerList />);
    expect(screen.getByText('github')).toBeInTheDocument();
  });
});
