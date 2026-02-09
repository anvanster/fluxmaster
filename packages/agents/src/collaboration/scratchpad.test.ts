import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScratchpadManager } from './scratchpad.js';
import { createScratchpadTools } from './scratchpad-tools.js';
import { EventBus } from '@fluxmaster/core';

describe('ScratchpadManager', () => {
  let manager: ScratchpadManager;

  beforeEach(() => {
    manager = new ScratchpadManager();
  });

  it('stores and retrieves values', () => {
    manager.set('conv1', 'plan', 'step 1: do stuff');
    expect(manager.get('conv1', 'plan')).toBe('step 1: do stuff');
  });

  it('returns undefined for missing keys', () => {
    expect(manager.get('conv1', 'missing')).toBeUndefined();
  });

  it('lists all entries for a conversation', () => {
    manager.set('conv1', 'a', '1');
    manager.set('conv1', 'b', '2');
    const entries = manager.list('conv1');
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual({ key: 'a', value: '1' });
  });

  it('isolates conversations', () => {
    manager.set('conv1', 'key', 'val1');
    manager.set('conv2', 'key', 'val2');
    expect(manager.get('conv1', 'key')).toBe('val1');
    expect(manager.get('conv2', 'key')).toBe('val2');
  });

  it('deletes specific key', () => {
    manager.set('conv1', 'key', 'val');
    expect(manager.delete('conv1', 'key')).toBe(true);
    expect(manager.get('conv1', 'key')).toBeUndefined();
  });

  it('clears entire conversation', () => {
    manager.set('conv1', 'a', '1');
    manager.set('conv1', 'b', '2');
    manager.clear('conv1');
    expect(manager.list('conv1')).toHaveLength(0);
  });
});

describe('scratchpad tools', () => {
  let manager: ScratchpadManager;
  let tools: ReturnType<typeof createScratchpadTools>;

  beforeEach(() => {
    manager = new ScratchpadManager();
    tools = createScratchpadTools(manager, 'test-conv');
  });

  it('creates 3 tools with correct names', () => {
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name)).toEqual(['scratchpad_write', 'scratchpad_read', 'scratchpad_list']);
  });

  it('scratchpad_write stores value', async () => {
    const write = tools.find((t) => t.name === 'scratchpad_write')!;
    const result = await write.execute({ key: 'plan', value: 'my plan' });
    expect(result.content).toContain("Wrote key 'plan'");
    expect(manager.get('test-conv', 'plan')).toBe('my plan');
  });

  it('scratchpad_read retrieves value', async () => {
    manager.set('test-conv', 'data', 'hello');
    const read = tools.find((t) => t.name === 'scratchpad_read')!;
    const result = await read.execute({ key: 'data' });
    expect(result.content).toBe('hello');
  });

  it('scratchpad_read returns not-found message', async () => {
    const read = tools.find((t) => t.name === 'scratchpad_read')!;
    const result = await read.execute({ key: 'missing' });
    expect(result.content).toContain('not found');
  });

  it('scratchpad_list returns all entries', async () => {
    manager.set('test-conv', 'a', '1');
    manager.set('test-conv', 'b', '2');
    const list = tools.find((t) => t.name === 'scratchpad_list')!;
    const result = await list.execute({});
    const entries = JSON.parse(result.content);
    expect(entries).toHaveLength(2);
  });

  it('scratchpad_list returns empty message', async () => {
    const list = tools.find((t) => t.name === 'scratchpad_list')!;
    const result = await list.execute({});
    expect(result.content).toBe('Scratchpad is empty');
  });

  it('emits scratchpad_updated event on write', async () => {
    const eventBus = new EventBus();
    const handler = vi.fn();
    eventBus.on('orchestration:scratchpad_updated', handler);

    const toolsWithEvents = createScratchpadTools(manager, 'test-conv', { eventBus });
    const write = toolsWithEvents.find((t) => t.name === 'scratchpad_write')!;
    await write.execute({ key: 'findings', value: 'some data' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toMatchObject({
      type: 'orchestration:scratchpad_updated',
      key: 'findings',
      action: 'write',
    });
  });

  it('does not throw when eventBus is not provided', async () => {
    const toolsNoEvents = createScratchpadTools(manager, 'test-conv');
    const write = toolsNoEvents.find((t) => t.name === 'scratchpad_write')!;
    const result = await write.execute({ key: 'k', value: 'v' });
    expect(result.content).toContain("Wrote key 'k'");
  });
});
