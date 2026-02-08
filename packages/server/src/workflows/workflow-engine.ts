import { randomUUID } from 'node:crypto';
import type { EventBus, WorkflowDefinition, WorkflowStep, WorkflowRun, StepResult, IWorkflowStore } from '@fluxmaster/core';
import type { AgentManager } from '@fluxmaster/agents';
import { VariableResolver } from './variable-resolver.js';

export class WorkflowEngine {
  private agentManager: AgentManager;
  private eventBus: EventBus;
  private workflowStore: IWorkflowStore;
  private activeRuns: Map<string, WorkflowRun> = new Map();

  constructor(agentManager: AgentManager, eventBus: EventBus, workflowStore: IWorkflowStore) {
    this.agentManager = agentManager;
    this.eventBus = eventBus;
    this.workflowStore = workflowStore;
  }

  async startRun(workflowId: string, inputs?: Record<string, unknown>): Promise<WorkflowRun> {
    const definition = this.workflowStore.getDefinition(workflowId);
    if (!definition) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const run: WorkflowRun = {
      id: randomUUID(),
      workflowId,
      status: 'running',
      inputs: inputs ?? {},
      stepResults: {},
      startedAt: new Date(),
    };

    this.activeRuns.set(run.id, run);
    this.workflowStore.saveRun(run);

    this.eventBus.emit({
      type: 'workflow:started',
      workflowId,
      runId: run.id,
      timestamp: new Date(),
    });

    try {
      await this.executeSteps(definition.steps, run);
      run.status = 'completed';
      run.completedAt = new Date();

      this.eventBus.emit({
        type: 'workflow:completed',
        workflowId,
        runId: run.id,
        timestamp: new Date(),
      });
    } catch (err) {
      run.status = 'failed';
      run.error = err instanceof Error ? err.message : String(err);
      run.completedAt = new Date();

      this.eventBus.emit({
        type: 'workflow:failed',
        workflowId,
        runId: run.id,
        error: run.error,
        timestamp: new Date(),
      });
    }

    this.workflowStore.updateRun(run.id, {
      status: run.status,
      stepResults: run.stepResults,
      completedAt: run.completedAt,
      error: run.error,
    });

    this.activeRuns.delete(run.id);
    return run;
  }

  getRunStatus(runId: string): WorkflowRun | undefined {
    // Check active runs first, then store
    return this.activeRuns.get(runId) ?? this.workflowStore.getRun(runId);
  }

  private async executeSteps(steps: WorkflowStep[], run: WorkflowRun): Promise<void> {
    for (const step of steps) {
      await this.executeStep(step, run);
    }
  }

  private async executeStep(step: WorkflowStep, run: WorkflowRun): Promise<void> {
    switch (step.type) {
      case 'agent':
        await this.executeAgentStep(step, run);
        break;
      case 'parallel':
        await this.executeParallelStep(step, run);
        break;
      case 'conditional':
        await this.executeConditionalStep(step, run);
        break;
      case 'loop':
        await this.executeLoopStep(step, run);
        break;
    }
  }

  private async executeAgentStep(
    step: Extract<WorkflowStep, { type: 'agent' }>,
    run: WorkflowRun,
  ): Promise<void> {
    const resolver = new VariableResolver(run.inputs, run.stepResults);
    const message = resolver.resolve(step.message);

    const result: StepResult = {
      stepId: step.id,
      status: 'running',
      startedAt: new Date(),
    };
    run.stepResults[step.id] = result;

    this.eventBus.emit({
      type: 'workflow:step_started',
      workflowId: run.workflowId,
      runId: run.id,
      stepId: step.id,
      timestamp: new Date(),
    });

    try {
      const response = await this.agentManager.routeMessage(step.agentId, message);
      result.status = 'completed';
      result.output = response.text;
      result.completedAt = new Date();

      this.eventBus.emit({
        type: 'workflow:step_completed',
        workflowId: run.workflowId,
        runId: run.id,
        stepId: step.id,
        output: response.text,
        timestamp: new Date(),
      });
    } catch (err) {
      result.status = 'failed';
      result.error = err instanceof Error ? err.message : String(err);
      result.completedAt = new Date();

      this.eventBus.emit({
        type: 'workflow:step_failed',
        workflowId: run.workflowId,
        runId: run.id,
        stepId: step.id,
        error: result.error,
        timestamp: new Date(),
      });

      throw err;
    }
  }

  private async executeParallelStep(
    step: Extract<WorkflowStep, { type: 'parallel' }>,
    run: WorkflowRun,
  ): Promise<void> {
    this.eventBus.emit({
      type: 'workflow:step_started',
      workflowId: run.workflowId,
      runId: run.id,
      stepId: step.id,
      timestamp: new Date(),
    });

    await Promise.all(step.steps.map((s) => this.executeStep(s, run)));

    const result: StepResult = {
      stepId: step.id,
      status: 'completed',
      completedAt: new Date(),
    };
    run.stepResults[step.id] = result;

    this.eventBus.emit({
      type: 'workflow:step_completed',
      workflowId: run.workflowId,
      runId: run.id,
      stepId: step.id,
      timestamp: new Date(),
    });
  }

  private async executeConditionalStep(
    step: Extract<WorkflowStep, { type: 'conditional' }>,
    run: WorkflowRun,
  ): Promise<void> {
    const resolver = new VariableResolver(run.inputs, run.stepResults);
    const conditionStr = resolver.resolve(step.condition);

    // Evaluate condition as a simple truthy check
    const conditionResult = this.evaluateCondition(conditionStr);

    const result: StepResult = {
      stepId: step.id,
      status: 'completed',
      output: conditionResult ? 'then' : 'else',
      completedAt: new Date(),
    };
    run.stepResults[step.id] = result;

    if (conditionResult) {
      await this.executeSteps(step.then, run);
    } else if (step.else) {
      await this.executeSteps(step.else, run);
    }
  }

  private async executeLoopStep(
    step: Extract<WorkflowStep, { type: 'loop' }>,
    run: WorkflowRun,
  ): Promise<void> {
    const resolver = new VariableResolver(run.inputs, run.stepResults);
    const overStr = resolver.resolve(step.over);

    let items: unknown[];
    try {
      items = JSON.parse(overStr);
      if (!Array.isArray(items)) items = [items];
    } catch {
      items = overStr.split(',').map((s) => s.trim());
    }

    const maxIter = step.maxIterations;
    const iterCount = Math.min(items.length, maxIter);

    this.eventBus.emit({
      type: 'workflow:step_started',
      workflowId: run.workflowId,
      runId: run.id,
      stepId: step.id,
      timestamp: new Date(),
    });

    for (let i = 0; i < iterCount; i++) {
      // For each iteration, create a scoped variable and execute child steps
      const loopVars = { [step.as]: items[i] };
      const childResolver = new VariableResolver(
        { ...run.inputs, ...loopVars },
        run.stepResults,
        loopVars,
      );

      for (const childStep of step.steps) {
        if (childStep.type === 'agent') {
          const message = childResolver.resolve(childStep.message);
          const iterStepId = `${childStep.id}_${i}`;

          const stepResult: StepResult = {
            stepId: iterStepId,
            status: 'running',
            startedAt: new Date(),
          };
          run.stepResults[iterStepId] = stepResult;

          try {
            const response = await this.agentManager.routeMessage(childStep.agentId, message);
            stepResult.status = 'completed';
            stepResult.output = response.text;
            stepResult.completedAt = new Date();
          } catch (err) {
            stepResult.status = 'failed';
            stepResult.error = err instanceof Error ? err.message : String(err);
            stepResult.completedAt = new Date();
            throw err;
          }
        } else {
          await this.executeStep(childStep, run);
        }
      }
    }

    run.stepResults[step.id] = {
      stepId: step.id,
      status: 'completed',
      completedAt: new Date(),
    };

    this.eventBus.emit({
      type: 'workflow:step_completed',
      workflowId: run.workflowId,
      runId: run.id,
      stepId: step.id,
      timestamp: new Date(),
    });
  }

  private evaluateCondition(conditionStr: string): boolean {
    // Simple truthy evaluation
    const lower = conditionStr.toLowerCase().trim();
    if (lower === 'false' || lower === '0' || lower === '' || lower === 'null' || lower === 'undefined') {
      return false;
    }
    return true;
  }
}
