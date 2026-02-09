import { useEffect } from 'react';
import { Badge } from '@/components/common/Badge';
import { StatusDot } from '@/components/common/StatusDot';
import { Button } from '@/components/common/Button';
import { X, Trash2, Brain, Wrench, Target, Zap, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { AgentInfoResponse } from '@fluxmaster/api-types';

interface AgentDetailDrawerProps {
  agent: AgentInfoResponse | null;
  onClose: () => void;
  onKill: (id: string) => void;
  killPending?: boolean;
}

function providerFromModel(model: string): string {
  if (model.startsWith('claude')) return 'Anthropic';
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'OpenAI';
  if (model.startsWith('gemini')) return 'Google';
  if (model.startsWith('grok')) return 'xAI';
  return 'Unknown';
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  idle: 'success',
  processing: 'warning',
  error: 'error',
  terminated: 'default',
};

function Section({ title, icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-800 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-xs font-medium uppercase text-gray-400 hover:text-gray-300"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        {title}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function AgentDetailDrawer({ agent, onClose, onKill, killPending }: AgentDetailDrawerProps) {
  useEffect(() => {
    if (!agent) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [agent, onClose]);

  if (!agent) return null;

  const persona = agent.persona;
  const provider = providerFromModel(agent.model);
  const displayName = persona?.identity.name ?? agent.id;
  const emoji = persona?.identity.emoji;
  const role = persona?.identity.role;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        data-testid="drawer-backdrop"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-700 bg-gray-900 shadow-2xl"
        data-testid="agent-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Agent details: ${displayName}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-800 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {emoji && <span className="text-2xl">{emoji}</span>}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">{displayName}</h2>
                {role && <p className="text-sm text-gray-400">{role}</p>}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusDot status={agent.status} />
              <Badge variant={statusVariant[agent.status]}>{agent.status}</Badge>
              <span className="text-xs text-gray-400">{agent.model}</span>
              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                {provider}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Soul */}
          {persona?.soul && (
            <Section title="Soul" icon={<Brain size={12} />}>
              {/* Core Traits */}
              <div className="mb-3">
                <span className="text-[10px] uppercase text-gray-500">Core Traits</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {persona.soul.coreTraits.map((trait) => (
                    <Badge key={trait} className="bg-blue-900/50 text-blue-300">{trait}</Badge>
                  ))}
                </div>
              </div>

              {/* Decision Framework */}
              <div className="mb-3">
                <span className="text-[10px] uppercase text-gray-500">Decision Framework</span>
                <p className="mt-0.5 text-xs text-gray-300">{persona.soul.decisionFramework}</p>
              </div>

              {/* Priorities */}
              <div className="mb-3">
                <span className="text-[10px] uppercase text-gray-500">Priorities</span>
                <ol className="mt-0.5 list-inside list-decimal text-xs text-gray-300 space-y-0.5">
                  {persona.soul.priorities.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              </div>

              {/* Communication Style */}
              {persona.soul.communicationStyle && (
                <div className="mb-3">
                  <span className="text-[10px] uppercase text-gray-500">Communication Style</span>
                  <p className="mt-0.5 text-xs text-gray-300">{persona.soul.communicationStyle}</p>
                </div>
              )}

              {/* Guidelines */}
              {persona.soul.guidelines && persona.soul.guidelines.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase text-gray-500">Guidelines</span>
                  <ul className="mt-0.5 list-inside list-disc text-xs text-gray-300 space-y-0.5">
                    {persona.soul.guidelines.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Tool Preferences */}
          {persona?.toolPreferences && (
            <Section title="Tool Preferences" icon={<Wrench size={12} />}>
              {persona.toolPreferences.preferred && persona.toolPreferences.preferred.length > 0 && (
                <div className="mb-3" data-testid="preferred-tools">
                  <span className="text-[10px] uppercase text-gray-500">Preferred</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {persona.toolPreferences.preferred.map((t) => (
                      <Badge key={t} variant="success">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {persona.toolPreferences.avoided && persona.toolPreferences.avoided.length > 0 && (
                <div className="mb-3" data-testid="avoided-tools">
                  <span className="text-[10px] uppercase text-gray-500">Avoided</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {persona.toolPreferences.avoided.map((t) => (
                      <Badge key={t} variant="error">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {persona.toolPreferences.usageHints && Object.keys(persona.toolPreferences.usageHints).length > 0 && (
                <div>
                  <span className="text-[10px] uppercase text-gray-500">Usage Hints</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(persona.toolPreferences.usageHints).map(([tool, hint]) => (
                      <div key={tool} className="text-xs">
                        <span className="text-gray-200 font-medium">{tool}</span>
                        <span className="text-gray-500"> — {hint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Memory Protocol */}
          {persona?.memoryProtocol && (
            <Section title="Memory Protocol" icon={<BookOpen size={12} />}>
              <div className="mb-3">
                <span className="text-[10px] uppercase text-gray-500">Should Remember</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {persona.memoryProtocol.shouldRemember.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <span className="text-[10px] uppercase text-gray-500">Recall Triggers</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {persona.memoryProtocol.recallTriggers.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Max recall entries:</span>
                <span className="text-gray-200">{persona.memoryProtocol.maxRecallEntries}</span>
              </div>
            </Section>
          )}

          {/* Autonomy */}
          {persona?.autonomy && (
            <Section title="Autonomy" icon={<Zap size={12} />} data-testid="autonomy-section">
              <div className="space-y-2" data-testid="autonomy-section">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1.5">
                    <span className="text-gray-400">Self-assign</span>
                    <Badge variant={persona.autonomy.canSelfAssign ? 'success' : 'default'}>
                      {persona.autonomy.canSelfAssign ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1.5">
                    <span className="text-gray-400">Reflection</span>
                    <Badge variant={persona.autonomy.reflectionEnabled ? 'success' : 'default'}>
                      {persona.autonomy.reflectionEnabled ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1.5">
                    <span className="text-gray-400">Auto-decompose</span>
                    <Badge variant={persona.autonomy.autoDecompose ? 'success' : 'default'}>
                      {persona.autonomy.autoDecompose ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1.5">
                    <span className="text-gray-400">Max iterations</span>
                    <span className="text-gray-200">{persona.autonomy.maxGoalIterations}</span>
                  </div>
                </div>
                {/* Confidence threshold bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Confidence threshold</span>
                    <span className="text-gray-200">{(persona.autonomy.confidenceThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-800">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${persona.autonomy.confidenceThreshold * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* Configuration */}
          <Section title="Configuration" icon={<Target size={12} />} defaultOpen={!persona}>
            <div className="space-y-3">
              {agent.tools && agent.tools.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase text-gray-500">
                    Tools ({agent.tools.length})
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {agent.tools.map((tool) => (
                      <span key={tool} className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-4 text-xs">
                {agent.temperature != null && (
                  <div>
                    <span className="text-gray-500">Temperature</span>
                    <p className="text-gray-300">{agent.temperature}</p>
                  </div>
                )}
                {agent.maxTokens != null && (
                  <div>
                    <span className="text-gray-500">Max Tokens</span>
                    <p className="text-gray-300">{agent.maxTokens.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* System Prompt (collapsible, default closed when persona exists) */}
          {agent.systemPrompt && (
            <Section title="System Prompt" icon={<BookOpen size={12} />} defaultOpen={!persona}>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{agent.systemPrompt}</p>
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-800 px-5 py-3 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">ID: {agent.id}</span>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onKill(agent.id)}
            disabled={killPending}
            data-testid="kill-agent-btn"
          >
            <Trash2 size={14} className="mr-1" />
            Kill Agent
          </Button>
        </div>
      </div>
    </>
  );
}
