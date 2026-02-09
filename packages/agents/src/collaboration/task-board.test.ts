import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskBoard } from './task-board.js';
import { createTaskBoardTools } from './task-board-tools.js';
import { EventBus } from '@fluxmaster/core';

describe('TaskBoard', () => {
  let board: TaskBoard;

  beforeEach(() => {
    board = new TaskBoard();
  });

  it('creates tasks with unique IDs', () => {
    const t1 = board.create('conv1', 'Task 1');
    const t2 = board.create('conv1', 'Task 2');
    expect(t1.id).not.toBe(t2.id);
    expect(t1.status).toBe('pending');
    expect(t1.title).toBe('Task 1');
  });

  it('creates task with description and assignee', () => {
    const task = board.create('conv1', 'Review code', 'Check for bugs', 'reviewer');
    expect(task.description).toBe('Check for bugs');
    expect(task.assignee).toBe('reviewer');
  });

  it('updates task status and result', () => {
    const task = board.create('conv1', 'Task');
    const updated = board.update('conv1', task.id, { status: 'completed', result: 'done' });
    expect(updated?.status).toBe('completed');
    expect(updated?.result).toBe('done');
  });

  it('returns undefined for missing task', () => {
    expect(board.update('conv1', 'nonexistent', { status: 'completed' })).toBeUndefined();
  });

  it('lists tasks with filters', () => {
    board.create('conv1', 'Task 1', undefined, 'coder');
    const t2 = board.create('conv1', 'Task 2', undefined, 'reviewer');
    board.update('conv1', t2.id, { status: 'completed' });

    expect(board.list('conv1')).toHaveLength(2);
    expect(board.list('conv1', { status: 'pending' })).toHaveLength(1);
    expect(board.list('conv1', { assignee: 'reviewer' })).toHaveLength(1);
    expect(board.list('conv1', { status: 'completed', assignee: 'reviewer' })).toHaveLength(1);
  });

  it('isolates conversations', () => {
    board.create('conv1', 'Task A');
    board.create('conv2', 'Task B');
    expect(board.list('conv1')).toHaveLength(1);
    expect(board.list('conv2')).toHaveLength(1);
  });

  it('gets task by id', () => {
    const task = board.create('conv1', 'My Task');
    expect(board.get('conv1', task.id)?.title).toBe('My Task');
    expect(board.get('conv1', 'nonexistent')).toBeUndefined();
  });
});

describe('task board tools', () => {
  let board: TaskBoard;
  let tools: ReturnType<typeof createTaskBoardTools>;

  beforeEach(() => {
    board = new TaskBoard();
    tools = createTaskBoardTools(board, 'test-conv');
  });

  it('creates 3 tools with correct names', () => {
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name)).toEqual(['task_create', 'task_update', 'task_list']);
  });

  it('task_create creates task', async () => {
    const create = tools.find((t) => t.name === 'task_create')!;
    const result = await create.execute({ title: 'Write tests', assignee: 'tester' });
    const task = JSON.parse(result.content);
    expect(task.title).toBe('Write tests');
    expect(task.assignee).toBe('tester');
    expect(task.status).toBe('pending');
  });

  it('task_update updates and returns task', async () => {
    const task = board.create('test-conv', 'Do work');
    const update = tools.find((t) => t.name === 'task_update')!;
    const result = await update.execute({ taskId: task.id, status: 'completed', result: 'All done' });
    const updated = JSON.parse(result.content);
    expect(updated.status).toBe('completed');
    expect(updated.result).toBe('All done');
  });

  it('task_update errors on missing task', async () => {
    const update = tools.find((t) => t.name === 'task_update')!;
    const result = await update.execute({ taskId: 'bogus', status: 'completed' });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not found');
  });

  it('task_list returns tasks with filter', async () => {
    board.create('test-conv', 'Task A', undefined, 'coder');
    board.create('test-conv', 'Task B', undefined, 'reviewer');
    const list = tools.find((t) => t.name === 'task_list')!;

    const allResult = await list.execute({});
    expect(JSON.parse(allResult.content)).toHaveLength(2);

    const filtered = await list.execute({ assignee: 'coder' });
    expect(JSON.parse(filtered.content)).toHaveLength(1);
  });

  it('task_list returns empty message', async () => {
    const list = tools.find((t) => t.name === 'task_list')!;
    const result = await list.execute({});
    expect(result.content).toBe('No tasks found');
  });

  it('emits task_created event on create', async () => {
    const eventBus = new EventBus();
    const handler = vi.fn();
    eventBus.on('orchestration:task_created', handler);

    const toolsWithEvents = createTaskBoardTools(board, 'test-conv', { eventBus });
    const create = toolsWithEvents.find((t) => t.name === 'task_create')!;
    await create.execute({ title: 'Fix bug', assignee: 'coder' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toMatchObject({
      type: 'orchestration:task_created',
      title: 'Fix bug',
      assignee: 'coder',
    });
    expect(handler.mock.calls[0][0].taskId).toBeTruthy();
  });

  it('emits task_status_changed event on status update', async () => {
    const eventBus = new EventBus();
    const handler = vi.fn();
    eventBus.on('orchestration:task_status_changed', handler);

    const task = board.create('test-conv', 'Do work');
    const toolsWithEvents = createTaskBoardTools(board, 'test-conv', { eventBus });
    const update = toolsWithEvents.find((t) => t.name === 'task_update')!;
    await update.execute({ taskId: task.id, status: 'completed' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toMatchObject({
      type: 'orchestration:task_status_changed',
      taskId: task.id,
      status: 'completed',
    });
  });

  it('does not emit task_status_changed when only updating result', async () => {
    const eventBus = new EventBus();
    const handler = vi.fn();
    eventBus.on('orchestration:task_status_changed', handler);

    const task = board.create('test-conv', 'Do work');
    const toolsWithEvents = createTaskBoardTools(board, 'test-conv', { eventBus });
    const update = toolsWithEvents.find((t) => t.name === 'task_update')!;
    await update.execute({ taskId: task.id, result: 'some result' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when eventBus is not provided', async () => {
    const toolsNoEvents = createTaskBoardTools(board, 'test-conv');
    const create = toolsNoEvents.find((t) => t.name === 'task_create')!;
    const result = await create.execute({ title: 'Test task' });
    expect(JSON.parse(result.content).title).toBe('Test task');
  });
});
