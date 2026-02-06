import type { McpServerInfo } from '@fluxmaster/api-types';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusDot } from '@/components/common/StatusDot';
import { Badge } from '@/components/common/Badge';

interface McpServerCardProps {
  server: McpServerInfo;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  isPending?: boolean;
}

export function McpServerCard({ server, isRunning, onStart, onStop, isPending }: McpServerCardProps) {
  return (
    <Card data-testid="mcp-server-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={isRunning ? 'connected' : 'disconnected'} />
          <span className="font-medium text-white">{server.name}</span>
          <Badge>{server.transport}</Badge>
        </div>
        {isRunning ? (
          <Button variant="danger" size="sm" onClick={onStop} disabled={isPending}>
            Stop
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={onStart} disabled={isPending}>
            Start
          </Button>
        )}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        {server.command || server.url || 'No command configured'}
      </div>
    </Card>
  );
}
