import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './prompt-builder.js';
import type { Persona } from '@fluxmaster/core';

const minimalPersona: Persona = {
  identity: { name: 'Worker', role: 'general assistant' },
  soul: {
    coreTraits: ['diligent'],
    decisionFramework: 'Follow instructions carefully',
    priorities: ['accuracy'],
  },
};

const fullPersona: Persona = {
  identity: { name: 'Coordinator', role: 'orchestration lead', emoji: '🎯' },
  soul: {
    coreTraits: ['strategic', 'delegation-oriented'],
    decisionFramework: 'Break complex tasks into specialist subtasks.',
    priorities: ['task decomposition', 'result synthesis'],
    communicationStyle: 'concise, structured',
    guidelines: ['Delegate, do not implement', 'Always verify results'],
  },
  toolPreferences: {
    preferred: ['delegate_to_agent', 'fan_out'],
    avoided: ['bash_execute'],
    usageHints: { delegate_to_agent: 'Use for sequential tasks' },
  },
  memoryProtocol: {
    shouldRemember: ['delegation outcomes'],
    recallTriggers: ['new task assignment'],
    maxRecallEntries: 15,
  },
  autonomy: {
    canSelfAssign: true,
    maxGoalIterations: 8,
    reflectionEnabled: true,
    autoDecompose: true,
    confidenceThreshold: 0.7,
  },
};

describe('buildSystemPrompt', () => {
  it('builds identity section', () => {
    const prompt = buildSystemPrompt({ persona: minimalPersona });
    expect(prompt).toContain('Worker');
    expect(prompt).toContain('general assistant');
  });

  it('includes emoji in identity when present', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).toContain('🎯');
    expect(prompt).toContain('Coordinator');
  });

  it('builds soul section with traits and framework', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).toContain('strategic');
    expect(prompt).toContain('delegation-oriented');
    expect(prompt).toContain('Break complex tasks into specialist subtasks.');
    expect(prompt).toContain('task decomposition');
    expect(prompt).toContain('result synthesis');
  });

  it('includes communication style when present', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).toContain('concise, structured');
  });

  it('includes guidelines when present', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).toContain('Delegate, do not implement');
    expect(prompt).toContain('Always verify results');
  });

  it('builds tool guidance section when toolPreferences present', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).toContain('delegate_to_agent');
    expect(prompt).toContain('fan_out');
    expect(prompt).toContain('bash_execute');
    expect(prompt).toContain('Use for sequential tasks');
  });

  it('omits tool guidance when no toolPreferences', () => {
    const prompt = buildSystemPrompt({ persona: minimalPersona });
    expect(prompt).not.toContain('Preferred Tools');
    expect(prompt).not.toContain('Avoided Tools');
  });

  it('includes memory context when provided', () => {
    const prompt = buildSystemPrompt({
      persona: fullPersona,
      recentMemories: [
        { type: 'decision', decision: 'Delegated auth to coder', reasoning: 'Coder has file tools', confidence: 0.9 },
        { type: 'learning', content: 'Researcher is slow on large codebases', learningType: 'pattern', confidence: 0.8 },
      ],
    });
    expect(prompt).toContain('Delegated auth to coder');
    expect(prompt).toContain('Coder has file tools');
    expect(prompt).toContain('Researcher is slow on large codebases');
  });

  it('omits memory section when no memories', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).not.toContain('Recent Memory');
  });

  it('includes active goal section when provided', () => {
    const prompt = buildSystemPrompt({
      persona: fullPersona,
      activeGoal: {
        goal: 'Refactor authentication module',
        currentStep: 1,
        totalSteps: 3,
        steps: ['Analyze current code', 'Design new structure', 'Implement changes'],
      },
    });
    expect(prompt).toContain('Refactor authentication module');
    expect(prompt).toContain('Step 2 of 3');
    expect(prompt).toContain('Design new structure');
    expect(prompt).toContain('[GOAL_COMPLETE]');
    expect(prompt).toContain('[GOAL_STEP_DONE]');
    expect(prompt).toContain('[BLOCKED:');
  });

  it('omits goal section when no active goal', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).not.toContain('[GOAL_COMPLETE]');
  });

  it('includes autonomy instructions when autonomy defined', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).toContain('Confidence threshold: 0.7');
  });

  it('omits autonomy section when no autonomy', () => {
    const prompt = buildSystemPrompt({ persona: minimalPersona });
    expect(prompt).not.toContain('Autonomy');
  });

  it('includes scratchpad entries when provided', () => {
    const prompt = buildSystemPrompt({
      persona: fullPersona,
      scratchpadEntries: [
        { key: 'findings', value: 'Found 3 security issues' },
        { key: 'plan', value: 'Fix auth first' },
      ],
    });
    expect(prompt).toContain('findings');
    expect(prompt).toContain('Found 3 security issues');
    expect(prompt).toContain('plan');
    expect(prompt).toContain('Fix auth first');
  });

  it('omits scratchpad section when no entries', () => {
    const prompt = buildSystemPrompt({ persona: fullPersona });
    expect(prompt).not.toContain('Shared Context');
  });
});
