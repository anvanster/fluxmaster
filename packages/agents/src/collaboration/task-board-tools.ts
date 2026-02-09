import { z } from 'zod';
import type { Tool, ToolResult, EventBus } from '@fluxmaster/core';
import type { TaskBoard } from './task-board.js';

export interface TaskBoardToolsOptions {
  eventBus?: EventBus;
}

export function createTaskBoardTools(taskBoard: TaskBoard, conversationId: string, options?: TaskBoardToolsOptions): Tool[] {
  const taskCreate: Tool = {
    name: 'task_create',
    description: 'Create a new task on the shared task board. Use this to break work into subtasks and optionally assign them to agents.',
    inputSchema: z.object({
      title: z.string().min(1).describe('Task title'),
      description: z.string().optional().describe('Detailed task description'),
      assignee: z.string().optional().describe('Agent ID to assign the task to'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const { title, description, assignee } = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        assignee: z.string().optional(),
      }).parse(args);
      const task = taskBoard.create(conversationId, title, description, assignee);
      options?.eventBus?.emit({
        type: 'orchestration:task_created',
        agentId: 'unknown',
        taskId: task.id,
        title,
        assignee,
        timestamp: new Date(),
      });
      return { content: JSON.stringify(task, null, 2) };
    },
  };

  const taskUpdate: Tool = {
    name: 'task_update',
    description: 'Update a task on the shared task board. Change status, record results, or reassign.',
    inputSchema: z.object({
      taskId: z.string().min(1).describe('Task ID to update'),
      status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional().describe('New status'),
      result: z.string().optional().describe('Task result or output'),
      assignee: z.string().optional().describe('New assignee agent ID'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const { taskId, ...updates } = z.object({
        taskId: z.string().min(1),
        status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
        result: z.string().optional(),
        assignee: z.string().optional(),
      }).parse(args);
      const task = taskBoard.update(conversationId, taskId, updates);
      if (!task) {
        return { content: `Task '${taskId}' not found`, isError: true };
      }
      if (updates.status) {
        options?.eventBus?.emit({
          type: 'orchestration:task_status_changed',
          agentId: 'unknown',
          taskId,
          status: updates.status,
          timestamp: new Date(),
        });
      }
      return { content: JSON.stringify(task, null, 2) };
    },
  };

  const taskList: Tool = {
    name: 'task_list',
    description: 'List tasks on the shared task board. Optionally filter by status or assignee.',
    inputSchema: z.object({
      status: z.string().optional().describe('Filter by status (pending, in_progress, completed, failed)'),
      assignee: z.string().optional().describe('Filter by assignee agent ID'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const filter = z.object({
        status: z.string().optional(),
        assignee: z.string().optional(),
      }).parse(args);
      const tasks = taskBoard.list(conversationId, filter);
      if (tasks.length === 0) {
        return { content: 'No tasks found' };
      }
      return { content: JSON.stringify(tasks, null, 2) };
    },
  };

  return [taskCreate, taskUpdate, taskList];
}
