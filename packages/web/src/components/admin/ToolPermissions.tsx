import { useSecurityPolicy } from '@/api/hooks/useSecurity';

const levelColors: Record<string, string> = {
  public: 'text-green-400',
  restricted: 'text-yellow-400',
  dangerous: 'text-red-400',
};

export function ToolPermissions() {
  const { data, isLoading } = useSecurityPolicy();

  if (isLoading) {
    return <div className="text-gray-400">Loading security policy...</div>;
  }

  const policy = data?.policy;
  if (!policy) {
    return <div className="text-gray-400">No security policy configured</div>;
  }

  const toolEntries = Object.entries(policy.toolLevels ?? {});
  const agentEntries = Object.entries(policy.agentPermissions ?? {});

  return (
    <div data-testid="tool-permissions" className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Default Level</h3>
        <span className={`text-sm font-mono ${levelColors[policy.defaultLevel] ?? 'text-gray-400'}`} data-testid="default-level">
          {policy.defaultLevel}
        </span>
      </div>

      {toolEntries.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Tool Levels</h3>
          <div className="space-y-1">
            {toolEntries.map(([tool, level]) => (
              <div key={tool} className="flex justify-between text-sm" data-testid="tool-level">
                <span className="text-gray-300 font-mono">{tool}</span>
                <span className={levelColors[level] ?? 'text-gray-400'}>{level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {agentEntries.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Agent Permissions</h3>
          <div className="space-y-2">
            {agentEntries.map(([agentId, perms]) => (
              <div key={agentId} className="bg-gray-800 p-2 rounded text-sm" data-testid="agent-permission">
                <div className="text-gray-300 font-medium">{agentId}</div>
                {perms.allowlist && (
                  <div className="text-gray-500 text-xs">Allow: {perms.allowlist.join(', ')}</div>
                )}
                {perms.denylist && (
                  <div className="text-gray-500 text-xs">Deny: {perms.denylist.join(', ')}</div>
                )}
                {perms.maxCallsPerMinute && (
                  <div className="text-gray-500 text-xs">Rate: {perms.maxCallsPerMinute}/min</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
