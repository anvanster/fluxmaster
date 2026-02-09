import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useSpawnAgent } from '@/api/hooks/useAgents';
import { useModels } from '@/api/hooks/useModels';
import { useTools } from '@/api/hooks/useTools';
import { AGENT_TEMPLATES, type AgentTemplate } from '@/data/agent-templates';
import { ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import type { PersonaInfoResponse } from '@fluxmaster/api-types';

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none';

const labelClass = 'mb-1 block text-xs text-gray-400';

const categoryLabels: Record<string, string> = {
  orchestration: 'Orchestration',
  development: 'Development',
  quality: 'Quality',
  specialist: 'Specialist',
};

const categoryOrder = ['orchestration', 'development', 'quality', 'specialist'] as const;

function CollapsibleSection({ title, defaultOpen = false, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-800 pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-300"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

// --- Template Picker ---

function TemplatePicker({ onSelect }: { onSelect: (t: AgentTemplate) => void }) {
  const grouped = categoryOrder.reduce<Record<string, AgentTemplate[]>>((acc, cat) => {
    acc[cat] = AGENT_TEMPLATES.filter((t) => t.category === cat);
    return acc;
  }, {});

  return (
    <div data-testid="template-picker">
      <h3 className="mb-4 text-base font-semibold text-white">Choose a Template</h3>
      {categoryOrder.map((cat) => {
        const templates = grouped[cat];
        if (!templates || templates.length === 0) return null;
        return (
          <div key={cat} className="mb-4">
            <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">{categoryLabels[cat]}</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t)}
                  className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-left transition-colors hover:border-gray-500 hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  data-testid="template-card"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{t.emoji}</span>
                    <span className="text-sm font-medium text-white">{t.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Config Form ---

interface FormState {
  id: string;
  model: string;
  systemPrompt: string;
  selectedTools: string[];
  temperature: number;
  maxTokens: number;
  // Persona
  name: string;
  role: string;
  emoji: string;
  coreTraits: string;
  decisionFramework: string;
  priorities: string;
  communicationStyle: string;
  guidelines: string;
  preferredTools: string;
  avoidedTools: string;
  shouldRemember: string;
  recallTriggers: string;
  maxRecallEntries: number;
  canSelfAssign: boolean;
  maxGoalIterations: number;
  reflectionEnabled: boolean;
  autoDecompose: boolean;
  confidenceThreshold: number;
}

function templateToForm(t: AgentTemplate): FormState {
  const p = t.defaults.persona;
  return {
    id: t.id === 'custom' ? '' : t.id,
    model: '',
    systemPrompt: t.defaults.systemPrompt,
    selectedTools: [...t.defaults.tools],
    temperature: t.defaults.temperature,
    maxTokens: t.defaults.maxTokens,
    name: p.identity.name,
    role: p.identity.role,
    emoji: p.identity.emoji ?? '',
    coreTraits: p.soul.coreTraits.join(', '),
    decisionFramework: p.soul.decisionFramework,
    priorities: p.soul.priorities.join(', '),
    communicationStyle: p.soul.communicationStyle ?? '',
    guidelines: p.soul.guidelines?.join('\n') ?? '',
    preferredTools: p.toolPreferences?.preferred?.join(', ') ?? '',
    avoidedTools: p.toolPreferences?.avoided?.join(', ') ?? '',
    shouldRemember: p.memoryProtocol?.shouldRemember.join(', ') ?? '',
    recallTriggers: p.memoryProtocol?.recallTriggers.join(', ') ?? '',
    maxRecallEntries: p.memoryProtocol?.maxRecallEntries ?? 10,
    canSelfAssign: p.autonomy?.canSelfAssign ?? false,
    maxGoalIterations: p.autonomy?.maxGoalIterations ?? 5,
    reflectionEnabled: p.autonomy?.reflectionEnabled ?? true,
    autoDecompose: p.autonomy?.autoDecompose ?? true,
    confidenceThreshold: p.autonomy?.confidenceThreshold ?? 0.7,
  };
}

function splitCsv(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

function formToSpawnRequest(f: FormState) {
  const persona: PersonaInfoResponse = {
    identity: {
      name: f.name,
      role: f.role,
      ...(f.emoji && { emoji: f.emoji }),
    },
    soul: {
      coreTraits: splitCsv(f.coreTraits),
      decisionFramework: f.decisionFramework,
      priorities: splitCsv(f.priorities),
      ...(f.communicationStyle && { communicationStyle: f.communicationStyle }),
      ...(f.guidelines.trim() && { guidelines: f.guidelines.split('\n').map((g) => g.trim()).filter(Boolean) }),
    },
    ...(f.preferredTools || f.avoidedTools
      ? {
          toolPreferences: {
            ...(f.preferredTools && { preferred: splitCsv(f.preferredTools) }),
            ...(f.avoidedTools && { avoided: splitCsv(f.avoidedTools) }),
          },
        }
      : {}),
    ...(f.shouldRemember || f.recallTriggers
      ? {
          memoryProtocol: {
            shouldRemember: splitCsv(f.shouldRemember),
            recallTriggers: splitCsv(f.recallTriggers),
            maxRecallEntries: f.maxRecallEntries,
          },
        }
      : {}),
    autonomy: {
      canSelfAssign: f.canSelfAssign,
      maxGoalIterations: f.maxGoalIterations,
      reflectionEnabled: f.reflectionEnabled,
      autoDecompose: f.autoDecompose,
      confidenceThreshold: f.confidenceThreshold,
    },
  };

  return {
    id: f.id.trim(),
    model: f.model,
    systemPrompt: f.systemPrompt.trim() || undefined,
    tools: f.selectedTools,
    temperature: f.temperature,
    maxTokens: f.maxTokens,
    persona,
  };
}

function ConfigForm({ form, onChange, onBack, onSpawn, isPending, models, tools }: {
  form: FormState;
  onChange: (updates: Partial<FormState>) => void;
  onBack: () => void;
  onSpawn: () => void;
  isPending: boolean;
  models: Array<{ id: string; provider: string; premiumMultiplier: number }>;
  tools: Array<{ name: string; description: string }>;
}) {
  const modelsByProvider = models.reduce<Record<string, typeof models>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  const toggleTool = (toolName: string) => {
    onChange({
      selectedTools: form.selectedTools.includes(toolName)
        ? form.selectedTools.filter((t) => t !== toolName)
        : [...form.selectedTools, toolName],
    });
  };

  const canSpawn = form.id.trim().length > 0 && form.model.length > 0;

  return (
    <div data-testid="agent-config-form">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          data-testid="back-btn"
        >
          <ArrowLeft size={18} />
        </button>
        <h3 className="text-base font-semibold text-white">Configure Agent</h3>
      </div>

      <div className="space-y-4">
        {/* --- Basic --- */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Agent ID *</label>
            <input
              value={form.id}
              onChange={(e) => onChange({ id: e.target.value })}
              placeholder="e.g. my-coordinator"
              className={inputClass}
              data-testid="agent-id-input"
            />
          </div>
          <div>
            <label className={labelClass}>Model *</label>
            <select
              value={form.model}
              onChange={(e) => onChange({ model: e.target.value })}
              className={inputClass}
              data-testid="agent-model-select"
            >
              <option value="">Select a model...</option>
              {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                <optgroup key={provider} label={provider}>
                  {providerModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} ({m.premiumMultiplier === 0 ? 'free' : `${m.premiumMultiplier}x`})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              Temperature <span className="text-gray-500">{form.temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={form.temperature}
              onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className={labelClass}>Max Tokens</label>
            <input
              type="number"
              value={form.maxTokens}
              onChange={(e) => onChange({ maxTokens: parseInt(e.target.value, 10) || 0 })}
              min={1}
              max={128000}
              className={inputClass}
            />
          </div>
        </div>

        {/* --- Identity --- */}
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">Identity</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Agent name"
                className={inputClass}
                data-testid="persona-name-input"
              />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <input
                value={form.role}
                onChange={(e) => onChange({ role: e.target.value })}
                placeholder="e.g. coding specialist"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Emoji</label>
              <input
                value={form.emoji}
                onChange={(e) => onChange({ emoji: e.target.value })}
                placeholder="🎯"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* --- Soul --- */}
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">Soul</h4>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Core Traits (comma-separated)</label>
              <input
                value={form.coreTraits}
                onChange={(e) => onChange({ coreTraits: e.target.value })}
                placeholder="strategic, analytical, pragmatic"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Decision Framework</label>
              <textarea
                value={form.decisionFramework}
                onChange={(e) => onChange({ decisionFramework: e.target.value })}
                placeholder="How this agent makes decisions..."
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </div>
            <div>
              <label className={labelClass}>Priorities (comma-separated)</label>
              <input
                value={form.priorities}
                onChange={(e) => onChange({ priorities: e.target.value })}
                placeholder="correctness, readability, performance"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Communication Style</label>
              <input
                value={form.communicationStyle}
                onChange={(e) => onChange({ communicationStyle: e.target.value })}
                placeholder="concise, structured"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Guidelines (one per line)</label>
              <textarea
                value={form.guidelines}
                onChange={(e) => onChange({ guidelines: e.target.value })}
                placeholder="One guideline per line..."
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        </div>

        {/* --- Tool Preferences --- */}
        <CollapsibleSection title="Tool Preferences">
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Preferred Tools (comma-separated)</label>
              <input
                value={form.preferredTools}
                onChange={(e) => onChange({ preferredTools: e.target.value })}
                placeholder="read_file, search_text"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Avoided Tools (comma-separated)</label>
              <input
                value={form.avoidedTools}
                onChange={(e) => onChange({ avoidedTools: e.target.value })}
                placeholder="bash_execute, write_file"
                className={inputClass}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* --- Memory Protocol --- */}
        <CollapsibleSection title="Memory Protocol">
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Should Remember (comma-separated)</label>
              <input
                value={form.shouldRemember}
                onChange={(e) => onChange({ shouldRemember: e.target.value })}
                placeholder="code patterns, error fixes"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Recall Triggers (comma-separated)</label>
              <input
                value={form.recallTriggers}
                onChange={(e) => onChange({ recallTriggers: e.target.value })}
                placeholder="starting implementation, similar code"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Max Recall Entries</label>
              <input
                type="number"
                value={form.maxRecallEntries}
                onChange={(e) => onChange({ maxRecallEntries: parseInt(e.target.value, 10) || 5 })}
                min={1}
                max={50}
                className={inputClass}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* --- Autonomy --- */}
        <CollapsibleSection title="Autonomy">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.canSelfAssign}
                  onChange={(e) => onChange({ canSelfAssign: e.target.checked })}
                  className="rounded border-gray-600"
                />
                Self-assign tasks
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.reflectionEnabled}
                  onChange={(e) => onChange({ reflectionEnabled: e.target.checked })}
                  className="rounded border-gray-600"
                />
                Reflection enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.autoDecompose}
                  onChange={(e) => onChange({ autoDecompose: e.target.checked })}
                  className="rounded border-gray-600"
                />
                Auto-decompose
              </label>
              <div>
                <label className={labelClass}>Max Iterations</label>
                <input
                  type="number"
                  value={form.maxGoalIterations}
                  onChange={(e) => onChange({ maxGoalIterations: parseInt(e.target.value, 10) || 1 })}
                  min={1}
                  max={20}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Confidence Threshold <span className="text-gray-500">{(form.confidenceThreshold * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form.confidenceThreshold}
                onChange={(e) => onChange({ confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* --- Tools --- */}
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">
            Tools ({form.selectedTools.length} selected)
          </h4>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded border border-gray-700 bg-gray-900 p-2">
            {tools.length === 0 ? (
              <p className="text-xs text-gray-500">No tools available</p>
            ) : (
              tools.map((tool) => (
                <label key={tool.name} className="flex items-start gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.selectedTools.includes(tool.name)}
                    onChange={() => toggleTool(tool.name)}
                    className="mt-0.5 rounded border-gray-600"
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

        {/* --- System Prompt --- */}
        <CollapsibleSection title="System Prompt" defaultOpen={true}>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            placeholder="You are a helpful assistant..."
            rows={5}
            className={`${inputClass} resize-y`}
          />
        </CollapsibleSection>
      </div>

      {/* --- Footer --- */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-3">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="back-btn-footer">
          Back
        </Button>
        <Button
          size="sm"
          onClick={onSpawn}
          disabled={!canSpawn || isPending}
          data-testid="spawn-agent-btn"
        >
          {isPending ? 'Creating...' : 'Create Agent'}
        </Button>
      </div>
    </div>
  );
}

// --- Main Modal ---

export function CreateAgentModal({ open, onClose }: CreateAgentModalProps) {
  const [step, setStep] = useState<'pick' | 'config'>('pick');
  const [form, setForm] = useState<FormState | null>(null);
  const spawn = useSpawnAgent();
  const { data: models = [] } = useModels();
  const { data: tools = [] } = useTools();

  const handleSelect = (template: AgentTemplate) => {
    setForm(templateToForm(template));
    setStep('config');
  };

  const handleBack = () => {
    setStep('pick');
    setForm(null);
  };

  const handleChange = (updates: Partial<FormState>) => {
    setForm((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleSpawn = () => {
    if (!form) return;
    spawn.mutate(formToSpawnRequest(form));
    setStep('pick');
    setForm(null);
    onClose();
  };

  const handleClose = () => {
    setStep('pick');
    setForm(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-3xl">
      {step === 'pick' && <TemplatePicker onSelect={handleSelect} />}
      {step === 'config' && form && (
        <ConfigForm
          form={form}
          onChange={handleChange}
          onBack={handleBack}
          onSpawn={handleSpawn}
          isPending={spawn.isPending}
          models={models}
          tools={tools}
        />
      )}
      {spawn.isError && (
        <p className="mt-2 text-xs text-red-400">Error: {spawn.error.message}</p>
      )}
    </Modal>
  );
}
