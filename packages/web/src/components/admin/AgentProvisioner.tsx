import { useState } from 'react';
import { useSpawnAgent } from '@/api/hooks/useAgents';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

export function AgentProvisioner() {
  const [id, setId] = useState('');
  const [model, setModel] = useState('');
  const spawn = useSpawnAgent();

  const handleSpawn = () => {
    if (!id.trim() || !model.trim()) return;
    spawn.mutate({ id: id.trim(), model: model.trim(), tools: [] });
    setId('');
    setModel('');
  };

  return (
    <Card data-testid="agent-provisioner">
      <h4 className="mb-3 text-sm font-medium text-gray-300">Spawn Agent</h4>
      <div className="space-y-2">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Agent ID"
          className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          data-testid="agent-id-input"
        />
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Model (e.g., gpt-4o)"
          className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          data-testid="agent-model-input"
        />
        <Button onClick={handleSpawn} disabled={!id.trim() || !model.trim() || spawn.isPending} size="sm">
          {spawn.isPending ? 'Spawning...' : 'Spawn'}
        </Button>
        {spawn.isError && <p className="text-xs text-red-400">Error: {spawn.error.message}</p>}
        {spawn.isSuccess && <p className="text-xs text-green-400">Agent spawned</p>}
      </div>
    </Card>
  );
}
