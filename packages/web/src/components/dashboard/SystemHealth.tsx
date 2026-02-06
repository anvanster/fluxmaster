import { Card } from '@/components/common/Card';
import { StatusDot } from '@/components/common/StatusDot';

interface SystemHealthProps {
  status: 'ok' | 'error';
  uptime: number;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SystemHealth({ status, uptime }: SystemHealthProps) {
  return (
    <Card data-testid="system-health">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">System Status</div>
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <StatusDot status={status === 'ok' ? 'connected' : 'disconnected'} />
            {status === 'ok' ? 'Healthy' : 'Error'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Uptime</div>
          <div className="text-sm font-medium text-white">{formatUptime(uptime)}</div>
        </div>
      </div>
    </Card>
  );
}
