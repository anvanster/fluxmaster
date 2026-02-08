import { useState } from 'react';
import { useSpawnAgent } from '@/api/hooks/useAgents';
import { useModels } from '@/api/hooks/useModels';
import { useTools } from '@/api/hooks/useTools';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ChevronDown, ChevronRight } from 'lucide-react';

const inputClass =
  'w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none';

function multiplierBadge(mult: number): string {
  if (mult === 0) return 'free';
  if (mult < 1) return `${mult}x`;
  return `${mult}x`;
}

function badgeColor(mult: number): string {
  if (mult === 0) return 'bg-green-900 text-green-300';
  if (mult <= 0.33) return 'bg-blue-900 text-blue-300';
  if (mult <= 1) return 'bg-yellow-900 text-yellow-300';
  return 'bg-red-900 text-red-300';
}

export function AgentProvisioner() {
  const [id, setId] = useState('');
  const [model, setModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const spawn = useSpawnAgent();
  const { data: models = [] } = useModels();
  const { data: tools = [] } = useTools();

  const handleSpawn = () => {
    if (!id.trim() || !model) return;
    spawn.mutate({
      id: id.trim(),
      model,
      systemPrompt: systemPrompt.trim() || undefined,
      tools: selectedTools,
      temperature,
      maxTokens,
    });
    setId('');
    setModel('');
    setSystemPrompt('');
    setSelectedTools([]);
    setTemperature(0.7);
    setMaxTokens(8192);
    setShowAdvanced(false);
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName],
    );
  };

  // Group models by provider
  const modelsByProvider = models.reduce<Record<string, typeof models>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  return (
    <Card data-testid="agent-provisioner">
      <h4 className="mb-3 text-sm font-medium text-gray-300">Spawn Agent</h4>
      <div className="space-y-3">
        {/* Agent ID */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Agent ID</label>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. researcher"
            className={inputClass}
            data-testid="agent-id-input"
          />
        </div>

        {/* Model Selector */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
            data-testid="agent-model-select"
          >
            <option value="">Select a model...</option>
            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
              <optgroup key={provider} label={provider}>
                {providerModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} ({multiplierBadge(m.premiumMultiplier)})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {model && models.length > 0 && (() => {
            const selected = models.find((m) => m.id === model);
            if (!selected) return null;
            return (
              <span
                className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${badgeColor(selected.premiumMultiplier)}`}
                data-testid="model-cost-badge"
              >
                {multiplierBadge(selected.premiumMultiplier)} premium
              </span>
            );
          })()}
        </div>

        {/* System Prompt */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant..."
            rows={3}
            className={`${inputClass} resize-y`}
            data-testid="agent-system-prompt"
          />
        </div>

        {/* Tool Selection */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Tools ({selectedTools.length} selected)
          </label>
          <div
            className="max-h-40 space-y-1 overflow-y-auto rounded border border-gray-700 bg-gray-900 p-2"
            data-testid="tool-selector"
          >
            {tools.length === 0 ? (
              <p className="text-xs text-gray-500">No tools available</p>
            ) : (
              tools.map((tool) => (
                <label key={tool.name} className="flex items-start gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(tool.name)}
                    onChange={() => toggleTool(tool.name)}
                    className="mt-0.5 rounded border-gray-600"
                    data-testid={`tool-checkbox-${tool.name}`}
                  />
                  <span>
                    <span className="text-gray-200">{tool.name}</span>
                    {tool.description && (
                      <span className="ml-1 text-xs text-gray-500">— {tool.description}</span>
                    )}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Advanced Section */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300"
          data-testid="advanced-toggle"
        >
          {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Advanced
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded border border-gray-800 bg-gray-950 p-3" data-testid="advanced-section">
            {/* Temperature */}
            <div>
              <label className="mb-1 flex items-center justify-between text-xs text-gray-400">
                <span>Temperature</span>
                <span className="text-gray-300" data-testid="temperature-value">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
                data-testid="temperature-slider"
              />
            </div>

            {/* Max Tokens */}
            <div>
              <label className="mb-1 block text-xs text-gray-400">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 0)}
                min={1}
                max={128000}
                className={inputClass}
                data-testid="max-tokens-input"
              />
            </div>
          </div>
        )}

        {/* Spawn Button */}
        <Button
          onClick={handleSpawn}
          disabled={!id.trim() || !model || spawn.isPending}
          size="sm"
        >
          {spawn.isPending ? 'Spawning...' : 'Spawn Agent'}
        </Button>
        {spawn.isError && <p className="text-xs text-red-400">Error: {spawn.error.message}</p>}
        {spawn.isSuccess && <p className="text-xs text-green-400">Agent spawned</p>}
      </div>
    </Card>
  );
}
