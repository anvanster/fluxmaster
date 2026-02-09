import { randomUUID } from 'node:crypto';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskBoard {
  private boards = new Map<string, Map<string, TaskItem>>();

  create(conversationId: string, title: string, description?: string, assignee?: string): TaskItem {
    if (!this.boards.has(conversationId)) {
      this.boards.set(conversationId, new Map());
    }
    const board = this.boards.get(conversationId)!;
    const now = new Date();
    const task: TaskItem = {
      id: randomUUID().slice(0, 8),
      title,
      description,
      assignee,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    board.set(task.id, task);
    return task;
  }

  update(
    conversationId: string,
    taskId: string,
    updates: Partial<Pick<TaskItem, 'status' | 'result' | 'assignee'>>,
  ): TaskItem | undefined {
    const task = this.boards.get(conversationId)?.get(taskId);
    if (!task) return undefined;
    if (updates.status !== undefined) task.status = updates.status;
    if (updates.result !== undefined) task.result = updates.result;
    if (updates.assignee !== undefined) task.assignee = updates.assignee;
    task.updatedAt = new Date();
    return task;
  }

  list(conversationId: string, filter?: { status?: string; assignee?: string }): TaskItem[] {
    const board = this.boards.get(conversationId);
    if (!board) return [];
    let tasks = Array.from(board.values());
    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter?.assignee) {
      tasks = tasks.filter((t) => t.assignee === filter.assignee);
    }
    return tasks;
  }

  get(conversationId: string, taskId: string): TaskItem | undefined {
    return this.boards.get(conversationId)?.get(taskId);
  }

  clear(conversationId: string): void {
    this.boards.delete(conversationId);
  }
}
