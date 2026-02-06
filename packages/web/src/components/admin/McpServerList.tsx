import { useMcpServers, useStartMcpServer, useStopMcpServer } from '@/api/hooks/useMcp';
import { McpServerCard } from './McpServerCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/Spinner';

export function McpServerList() {
  const { data, isLoading } = useMcpServers();
  const startServer = useStartMcpServer();
  const stopServer = useStopMcpServer();

  if (isLoading) return <Spinner />;
  if (!data || data.configured.length === 0) {
    return <EmptyState title="No MCP servers configured" />;
  }

  return (
    <div className="space-y-3" data-testid="mcp-server-list">
      {data.configured.map((server) => (
        <McpServerCard
          key={server.name}
          server={server}
          isRunning={data.running.includes(server.name)}
          onStart={() => startServer.mutate(server.name)}
          onStop={() => stopServer.mutate(server.name)}
          isPending={startServer.isPending || stopServer.isPending}
        />
      ))}
    </div>
  );
}
