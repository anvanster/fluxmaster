import { useDeniedCalls } from '@/api/hooks/useSecurity';

export function ToolAuditLog() {
  const { data, isLoading } = useDeniedCalls({ limit: 50 });

  if (isLoading) {
    return <div className="text-gray-400">Loading audit log...</div>;
  }

  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return <div className="text-gray-400" data-testid="audit-empty">No denied tool calls</div>;
  }

  return (
    <div data-testid="audit-log">
      <h3 className="text-sm font-medium text-gray-300 mb-2">Recent Denied Calls</h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded bg-gray-800 p-3 text-sm border border-red-900/30"
            data-testid="audit-entry"
          >
            <div className="flex justify-between">
              <span className="text-red-400 font-medium">{entry.toolName}</span>
              <span className="text-gray-500 text-xs">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Agent: {entry.agentId}
            </div>
            {entry.denialReason && (
              <div className="text-gray-500 text-xs mt-1">{entry.denialReason}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
