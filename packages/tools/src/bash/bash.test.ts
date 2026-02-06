import { describe, it, expect } from 'vitest';
import { bashExecuteTool } from './execute.js';

describe('bash_execute', () => {
  it('executes simple command and returns stdout', async () => {
    const result = await bashExecuteTool.execute({ command: 'echo hello' });
    expect(result.content).toContain('hello');
    expect(result.isError).toBeUndefined();
  });

  it('returns stderr content in error result', async () => {
    const result = await bashExecuteTool.execute({ command: 'ls /nonexistent_dir_12345' });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Exit code');
  });

  it('respects timeout', async () => {
    const result = await bashExecuteTool.execute({
      command: 'sleep 10',
      timeout: 100,
    });
    expect(result.isError).toBe(true);
  }, 5000);

  it('captures exit code in result', async () => {
    const result = await bashExecuteTool.execute({ command: 'exit 42' });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('42');
  });
});
