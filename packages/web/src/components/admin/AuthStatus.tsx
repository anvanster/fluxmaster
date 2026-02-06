import { useAuthStatus } from '@/api/hooks/useAuth';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { StatusDot } from '@/components/common/StatusDot';
import { Spinner } from '@/components/common/Spinner';

export function AuthStatus() {
  const { data: status, isLoading } = useAuthStatus();

  if (isLoading) return <Spinner />;
  if (!status) return null;

  return (
    <Card data-testid="auth-status">
      <h4 className="mb-3 text-sm font-medium text-gray-300">Authentication</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Copilot Configured</span>
          <StatusDot status={status.copilotConfigured ? 'connected' : 'disconnected'} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Copilot Ready</span>
          <StatusDot status={status.copilotReady ? 'connected' : 'disconnected'} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Claude CLI</span>
          <StatusDot status={status.claudeCli ? 'connected' : 'disconnected'} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Direct Providers</span>
          <div className="flex gap-1">
            {status.directProviders.length > 0
              ? status.directProviders.map((p) => <Badge key={p} variant="success">{p}</Badge>)
              : <span className="text-gray-500">None</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
