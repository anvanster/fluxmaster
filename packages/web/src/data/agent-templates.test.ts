import { describe, it, expect } from 'vitest';
import { AGENT_TEMPLATES, type AgentTemplate } from './agent-templates';

describe('AGENT_TEMPLATES', () => {
  it('has 12 templates', () => {
    expect(AGENT_TEMPLATES).toHaveLength(12);
  });

  it('all templates have unique IDs', () => {
    const ids = AGENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all templates have required fields', () => {
    for (const t of AGENT_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(['orchestration', 'development', 'quality', 'specialist']).toContain(t.category);
    }
  });

  it('all templates have valid defaults', () => {
    for (const t of AGENT_TEMPLATES) {
      expect(t.defaults.systemPrompt).toBeDefined();
      expect(Array.isArray(t.defaults.tools)).toBe(true);
      expect(typeof t.defaults.temperature).toBe('number');
      expect(typeof t.defaults.maxTokens).toBe('number');
    }
  });

  it('non-custom templates have valid persona structure', () => {
    for (const t of AGENT_TEMPLATES.filter((t) => t.id !== 'custom')) {
      const p = t.defaults.persona;
      expect(p.identity.name).toBeTruthy();
      expect(p.identity.role).toBeTruthy();
      expect(Array.isArray(p.soul.coreTraits)).toBe(true);
      expect(p.soul.decisionFramework).toBeTruthy();
      expect(Array.isArray(p.soul.priorities)).toBe(true);
    }
  });

  it('non-custom templates have non-empty traits and priorities', () => {
    for (const t of AGENT_TEMPLATES.filter((t) => t.id !== 'custom')) {
      expect(t.defaults.persona.soul.coreTraits.length).toBeGreaterThan(0);
      expect(t.defaults.persona.soul.priorities.length).toBeGreaterThan(0);
    }
  });

  it('custom template has empty traits and priorities', () => {
    const custom = AGENT_TEMPLATES.find((t) => t.id === 'custom')!;
    expect(custom).toBeDefined();
    expect(custom.defaults.persona.soul.coreTraits).toHaveLength(0);
    expect(custom.defaults.persona.soul.priorities).toHaveLength(0);
  });

  it('has templates in all categories', () => {
    const categories = new Set(AGENT_TEMPLATES.map((t) => t.category));
    expect(categories).toContain('orchestration');
    expect(categories).toContain('development');
    expect(categories).toContain('quality');
    expect(categories).toContain('specialist');
  });

  it('includes the 4 core roles (coordinator, coder, reviewer, tester)', () => {
    const ids = AGENT_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('coordinator');
    expect(ids).toContain('coder');
    expect(ids).toContain('reviewer');
    expect(ids).toContain('tester');
  });
});
