import { describe, it, expect } from 'vitest';
import {
  PersonaIdentitySchema,
  PersonaSoulSchema,
  PersonaToolPreferencesSchema,
  PersonaMemoryProtocolSchema,
  PersonaAutonomySchema,
  PersonaSchema,
} from './persona.js';

describe('PersonaIdentitySchema', () => {
  it('parses valid identity', () => {
    const result = PersonaIdentitySchema.parse({
      name: 'Coordinator',
      role: 'orchestration lead',
      emoji: '🎯',
    });
    expect(result.name).toBe('Coordinator');
    expect(result.role).toBe('orchestration lead');
    expect(result.emoji).toBe('🎯');
  });

  it('emoji is optional', () => {
    const result = PersonaIdentitySchema.parse({
      name: 'Coder',
      role: 'implementation specialist',
    });
    expect(result.emoji).toBeUndefined();
  });

  it('rejects empty name', () => {
    expect(() => PersonaIdentitySchema.parse({ name: '', role: 'test' })).toThrow();
  });

  it('rejects empty role', () => {
    expect(() => PersonaIdentitySchema.parse({ name: 'Test', role: '' })).toThrow();
  });
});

describe('PersonaSoulSchema', () => {
  it('parses valid soul', () => {
    const result = PersonaSoulSchema.parse({
      coreTraits: ['strategic', 'analytical'],
      decisionFramework: 'Break tasks into subtasks',
      priorities: ['quality', 'speed'],
    });
    expect(result.coreTraits).toEqual(['strategic', 'analytical']);
    expect(result.decisionFramework).toBe('Break tasks into subtasks');
    expect(result.priorities).toEqual(['quality', 'speed']);
    expect(result.communicationStyle).toBeUndefined();
    expect(result.guidelines).toBeUndefined();
  });

  it('accepts optional fields', () => {
    const result = PersonaSoulSchema.parse({
      coreTraits: ['meticulous'],
      decisionFramework: 'Correctness first',
      priorities: ['accuracy'],
      communicationStyle: 'concise',
      guidelines: ['Check twice', 'Document everything'],
    });
    expect(result.communicationStyle).toBe('concise');
    expect(result.guidelines).toEqual(['Check twice', 'Document everything']);
  });

  it('rejects empty coreTraits', () => {
    expect(() => PersonaSoulSchema.parse({
      coreTraits: [],
      decisionFramework: 'test',
      priorities: ['test'],
    })).toThrow();
  });

  it('rejects empty priorities', () => {
    expect(() => PersonaSoulSchema.parse({
      coreTraits: ['test'],
      decisionFramework: 'test',
      priorities: [],
    })).toThrow();
  });
});

describe('PersonaToolPreferencesSchema', () => {
  it('parses valid tool preferences', () => {
    const result = PersonaToolPreferencesSchema.parse({
      preferred: ['delegate_to_agent', 'fan_out'],
      avoided: ['bash_execute'],
      usageHints: { delegate_to_agent: 'Use for sequential tasks' },
    });
    expect(result.preferred).toEqual(['delegate_to_agent', 'fan_out']);
    expect(result.avoided).toEqual(['bash_execute']);
    expect(result.usageHints?.delegate_to_agent).toBe('Use for sequential tasks');
  });

  it('all fields are optional', () => {
    const result = PersonaToolPreferencesSchema.parse({});
    expect(result.preferred).toBeUndefined();
    expect(result.avoided).toBeUndefined();
    expect(result.usageHints).toBeUndefined();
  });
});

describe('PersonaMemoryProtocolSchema', () => {
  it('parses valid memory protocol', () => {
    const result = PersonaMemoryProtocolSchema.parse({
      shouldRemember: ['delegation outcomes', 'error patterns'],
      recallTriggers: ['new task assignment'],
    });
    expect(result.shouldRemember).toEqual(['delegation outcomes', 'error patterns']);
    expect(result.recallTriggers).toEqual(['new task assignment']);
    expect(result.maxRecallEntries).toBe(10); // default
  });

  it('accepts custom maxRecallEntries', () => {
    const result = PersonaMemoryProtocolSchema.parse({
      shouldRemember: ['test'],
      recallTriggers: ['test'],
      maxRecallEntries: 20,
    });
    expect(result.maxRecallEntries).toBe(20);
  });

  it('rejects empty shouldRemember', () => {
    expect(() => PersonaMemoryProtocolSchema.parse({
      shouldRemember: [],
      recallTriggers: ['test'],
    })).toThrow();
  });
});

describe('PersonaAutonomySchema', () => {
  it('applies defaults', () => {
    const result = PersonaAutonomySchema.parse({});
    expect(result.canSelfAssign).toBe(false);
    expect(result.maxGoalIterations).toBe(5);
    expect(result.reflectionEnabled).toBe(true);
    expect(result.autoDecompose).toBe(true);
    expect(result.confidenceThreshold).toBe(0.7);
  });

  it('accepts custom values', () => {
    const result = PersonaAutonomySchema.parse({
      canSelfAssign: true,
      maxGoalIterations: 10,
      reflectionEnabled: false,
      autoDecompose: false,
      confidenceThreshold: 0.9,
    });
    expect(result.canSelfAssign).toBe(true);
    expect(result.maxGoalIterations).toBe(10);
    expect(result.reflectionEnabled).toBe(false);
    expect(result.confidenceThreshold).toBe(0.9);
  });

  it('rejects confidenceThreshold out of range', () => {
    expect(() => PersonaAutonomySchema.parse({ confidenceThreshold: -0.1 })).toThrow();
    expect(() => PersonaAutonomySchema.parse({ confidenceThreshold: 1.1 })).toThrow();
  });
});

describe('PersonaSchema', () => {
  const validPersona = {
    identity: { name: 'Coordinator', role: 'orchestration lead', emoji: '🎯' },
    soul: {
      coreTraits: ['strategic', 'delegation-oriented'],
      decisionFramework: 'Break complex tasks into specialist subtasks.',
      priorities: ['task decomposition', 'result synthesis'],
      communicationStyle: 'concise',
      guidelines: ['Delegate, do not implement'],
    },
    toolPreferences: {
      preferred: ['delegate_to_agent', 'fan_out'],
      avoided: ['bash_execute'],
    },
    memoryProtocol: {
      shouldRemember: ['delegation outcomes'],
      recallTriggers: ['new task assignment'],
      maxRecallEntries: 15,
    },
    autonomy: {
      canSelfAssign: true,
      maxGoalIterations: 8,
    },
  };

  it('parses a full persona', () => {
    const result = PersonaSchema.parse(validPersona);
    expect(result.identity.name).toBe('Coordinator');
    expect(result.soul.coreTraits).toContain('strategic');
    expect(result.toolPreferences?.preferred).toContain('delegate_to_agent');
    expect(result.memoryProtocol?.maxRecallEntries).toBe(15);
    expect(result.autonomy?.canSelfAssign).toBe(true);
    expect(result.autonomy?.maxGoalIterations).toBe(8);
  });

  it('parses minimal persona (no optional sections)', () => {
    const result = PersonaSchema.parse({
      identity: { name: 'Worker', role: 'general' },
      soul: {
        coreTraits: ['diligent'],
        decisionFramework: 'Follow instructions',
        priorities: ['accuracy'],
      },
    });
    expect(result.identity.name).toBe('Worker');
    expect(result.toolPreferences).toBeUndefined();
    expect(result.memoryProtocol).toBeUndefined();
    expect(result.autonomy).toBeUndefined();
  });

  it('rejects missing identity', () => {
    expect(() => PersonaSchema.parse({
      soul: { coreTraits: ['x'], decisionFramework: 'y', priorities: ['z'] },
    })).toThrow();
  });

  it('rejects missing soul', () => {
    expect(() => PersonaSchema.parse({
      identity: { name: 'Test', role: 'test' },
    })).toThrow();
  });
});
