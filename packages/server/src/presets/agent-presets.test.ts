import { describe, it, expect } from 'vitest';
import { AGENT_PRESETS, AGENT_PERSONAS, getPreset, listPresets } from './agent-presets.js';
import { PersonaSchema } from '@fluxmaster/core';

describe('AGENT_PERSONAS', () => {
  it('defines personas for all 4 preset agents', () => {
    expect(Object.keys(AGENT_PERSONAS)).toEqual(
      expect.arrayContaining(['coordinator', 'coder', 'reviewer', 'tester']),
    );
    expect(Object.keys(AGENT_PERSONAS)).toHaveLength(4);
  });

  it('all personas pass Zod validation', () => {
    for (const [role, persona] of Object.entries(AGENT_PERSONAS)) {
      const result = PersonaSchema.safeParse(persona);
      expect(result.success, `${role} persona failed validation: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  describe('coordinator persona', () => {
    it('has identity with orchestration role', () => {
      const p = AGENT_PERSONAS.coordinator;
      expect(p.identity.name).toBe('Coordinator');
      expect(p.identity.role).toContain('orchestration');
    });

    it('has strategic core traits', () => {
      expect(AGENT_PERSONAS.coordinator.soul.coreTraits).toContain('strategic');
      expect(AGENT_PERSONAS.coordinator.soul.coreTraits).toContain('delegation-oriented');
    });

    it('prefers delegation tools', () => {
      const prefs = AGENT_PERSONAS.coordinator.toolPreferences!;
      expect(prefs.preferred).toContain('delegate_to_agent');
      expect(prefs.preferred).toContain('fan_out');
    });

    it('avoids implementation tools', () => {
      const prefs = AGENT_PERSONAS.coordinator.toolPreferences!;
      expect(prefs.avoided).toContain('bash_execute');
    });

    it('has memory protocol', () => {
      const mem = AGENT_PERSONAS.coordinator.memoryProtocol!;
      expect(mem.shouldRemember.length).toBeGreaterThan(0);
      expect(mem.recallTriggers.length).toBeGreaterThan(0);
    });

    it('has autonomy enabled with self-assign', () => {
      const auto = AGENT_PERSONAS.coordinator.autonomy!;
      expect(auto.canSelfAssign).toBe(true);
      expect(auto.maxGoalIterations).toBe(8);
    });
  });

  describe('coder persona', () => {
    it('has identity with implementation role', () => {
      const p = AGENT_PERSONAS.coder;
      expect(p.identity.name).toBe('Coder');
      expect(p.identity.role).toContain('implementation');
    });

    it('has implementation-focused core traits', () => {
      expect(AGENT_PERSONAS.coder.soul.coreTraits).toContain('meticulous');
    });

    it('prefers file operation tools', () => {
      const prefs = AGENT_PERSONAS.coder.toolPreferences!;
      expect(prefs.preferred).toContain('edit_file');
      expect(prefs.preferred).toContain('read_file');
    });

    it('has memory protocol for code patterns', () => {
      const mem = AGENT_PERSONAS.coder.memoryProtocol!;
      expect(mem.shouldRemember).toEqual(
        expect.arrayContaining([expect.stringMatching(/pattern/i)]),
      );
    });

    it('has autonomy with lower iteration limit', () => {
      const auto = AGENT_PERSONAS.coder.autonomy!;
      expect(auto.canSelfAssign).toBe(false);
      expect(auto.maxGoalIterations).toBeLessThanOrEqual(5);
    });
  });

  describe('reviewer persona', () => {
    it('has identity with review role', () => {
      const p = AGENT_PERSONAS.reviewer;
      expect(p.identity.name).toBe('Reviewer');
      expect(p.identity.role).toContain('review');
    });

    it('has security-aware core traits', () => {
      expect(AGENT_PERSONAS.reviewer.soul.coreTraits).toContain('security-conscious');
    });

    it('avoids write tools', () => {
      const prefs = AGENT_PERSONAS.reviewer.toolPreferences!;
      expect(prefs.avoided).toContain('write_file');
      expect(prefs.avoided).toContain('edit_file');
    });

    it('does not have autonomy (read-only agent)', () => {
      expect(AGENT_PERSONAS.reviewer.autonomy).toBeUndefined();
    });
  });

  describe('tester persona', () => {
    it('has identity with testing role', () => {
      const p = AGENT_PERSONAS.tester;
      expect(p.identity.name).toBe('Tester');
      expect(p.identity.role).toContain('test');
    });

    it('has quality-focused core traits', () => {
      expect(AGENT_PERSONAS.tester.soul.coreTraits).toContain('thorough');
    });

    it('prefers testing tools', () => {
      const prefs = AGENT_PERSONAS.tester.toolPreferences!;
      expect(prefs.preferred).toContain('bash_execute');
    });

    it('has memory protocol for test patterns', () => {
      const mem = AGENT_PERSONAS.tester.memoryProtocol!;
      expect(mem.shouldRemember).toEqual(
        expect.arrayContaining([expect.stringMatching(/test/i)]),
      );
    });

    it('has autonomy with moderate iteration limit', () => {
      const auto = AGENT_PERSONAS.tester.autonomy!;
      expect(auto.canSelfAssign).toBe(false);
      expect(auto.maxGoalIterations).toBeLessThanOrEqual(5);
    });
  });
});

describe('AGENT_PRESETS integration', () => {
  it('presets include persona field for all agents', () => {
    for (const [role, preset] of Object.entries(AGENT_PRESETS)) {
      expect(preset.persona, `${role} preset missing persona`).toBeDefined();
      expect(preset.persona).toEqual(AGENT_PERSONAS[role]);
    }
  });

  it('presets retain existing systemPrompt as fallback', () => {
    for (const preset of Object.values(AGENT_PRESETS)) {
      expect(preset.systemPrompt).toBeDefined();
      expect(preset.systemPrompt!.length).toBeGreaterThan(0);
    }
  });

  it('getPreset returns preset with persona', () => {
    const coord = getPreset('coordinator');
    expect(coord?.persona).toBeDefined();
    expect(coord?.persona?.identity.name).toBe('Coordinator');
  });

  it('listPresets returns all preset names', () => {
    expect(listPresets()).toEqual(['coordinator', 'coder', 'reviewer', 'tester']);
  });
});
