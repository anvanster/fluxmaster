import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminView } from './AdminView';

// Mock all child components to isolate AdminView tab logic
vi.mock('./ConfigEditor', () => ({ ConfigEditor: () => <div data-testid="config-editor">config</div> }));
vi.mock('./AgentProvisioner', () => ({ AgentProvisioner: () => <div data-testid="agent-provisioner">agents</div> }));
vi.mock('./AgentList', () => ({ AgentList: () => <div data-testid="agent-list">agent list</div> }));
vi.mock('./McpServerList', () => ({ McpServerList: () => <div data-testid="mcp-server-list">mcp</div> }));
vi.mock('./PluginList', () => ({ PluginList: () => <div data-testid="plugin-list">plugins</div> }));
vi.mock('./AuthStatus', () => ({ AuthStatus: () => <div data-testid="auth-status">auth</div> }));
vi.mock('./ToolAuditLog', () => ({ ToolAuditLog: () => <div data-testid="tool-audit-log">audit</div> }));
vi.mock('./ToolPermissions', () => ({ ToolPermissions: () => <div data-testid="tool-permissions">perms</div> }));

describe('AdminView', () => {
  it('renders Config tab by default', () => {
    render(<AdminView />);
    expect(screen.getByTestId('admin-view')).toBeInTheDocument();
    expect(screen.getByTestId('config-editor')).toBeInTheDocument();
  });

  it('switches to Agents tab', () => {
    render(<AdminView />);
    fireEvent.click(screen.getByText('Agents'));
    expect(screen.getByTestId('agent-provisioner')).toBeInTheDocument();
    expect(screen.queryByTestId('config-editor')).not.toBeInTheDocument();
  });

  it('switches to MCP tab', () => {
    render(<AdminView />);
    fireEvent.click(screen.getByText('MCP'));
    expect(screen.getByTestId('mcp-server-list')).toBeInTheDocument();
  });

  it('switches to Plugins tab', () => {
    render(<AdminView />);
    fireEvent.click(screen.getByText('Plugins'));
    expect(screen.getByTestId('plugin-list')).toBeInTheDocument();
  });

  it('switches to Auth tab', () => {
    render(<AdminView />);
    fireEvent.click(screen.getByText('Auth'));
    expect(screen.getByTestId('auth-status')).toBeInTheDocument();
  });

  it('switches to Security tab', () => {
    render(<AdminView />);
    fireEvent.click(screen.getByText('Security'));
    expect(screen.getByTestId('tool-permissions')).toBeInTheDocument();
    expect(screen.getByTestId('tool-audit-log')).toBeInTheDocument();
  });
});
