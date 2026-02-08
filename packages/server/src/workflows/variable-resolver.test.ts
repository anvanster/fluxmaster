import { describe, it, expect } from 'vitest';
import { VariableResolver } from './variable-resolver.js';

describe('VariableResolver', () => {
  it('resolves simple input variables', () => {
    const resolver = new VariableResolver({ topic: 'AI safety' }, {});
    expect(resolver.resolve('Research: ${topic}')).toBe('Research: AI safety');
  });

  it('resolves step output variables', () => {
    const resolver = new VariableResolver({}, {
      research: { stepId: 'research', status: 'completed', output: 'AI is transformative' },
    });
    expect(resolver.resolve('Summarize: ${research.output}')).toBe('Summarize: AI is transformative');
  });

  it('resolves multiple variables in one string', () => {
    const resolver = new VariableResolver(
      { topic: 'AI' },
      { research: { stepId: 'research', status: 'completed', output: 'findings' } },
    );
    expect(resolver.resolve('${topic}: ${research.output}')).toBe('AI: findings');
  });

  it('leaves unresolvable variables as-is', () => {
    const resolver = new VariableResolver({}, {});
    expect(resolver.resolve('${unknown}')).toBe('${unknown}');
  });

  it('resolves loop variable', () => {
    const resolver = new VariableResolver({ topic: 'AI' }, {}, { item: 'safety' });
    expect(resolver.resolve('${item} in ${topic}')).toBe('safety in AI');
  });

  it('handles empty template', () => {
    const resolver = new VariableResolver({}, {});
    expect(resolver.resolve('')).toBe('');
  });

  it('handles template with no variables', () => {
    const resolver = new VariableResolver({}, {});
    expect(resolver.resolve('Hello world')).toBe('Hello world');
  });
});
