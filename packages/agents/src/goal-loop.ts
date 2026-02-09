import { randomUUID } from 'node:crypto';
import type { Persona, IAgentMemoryStore } from '@fluxmaster/core';
import type { EventBus } from '@fluxmaster/core';
import { buildSystemPrompt } from './prompt-builder.js';
import type { ToolLoopResult } from './tool-loop.js';

export interface GoalLoopOptions {
  process: (message: string, systemPrompt?: string) => Promise<ToolLoopResult>;
  agentId: string;
  goal: string;
  persona: Persona;
  memoryStore?: IAgentMemoryStore;
  eventBus?: EventBus;
  maxIterations?: number;
}

export interface GoalLoopResult {
  goalId: string;
  status: 'completed' | 'blocked' | 'failed' | 'max_iterations';
  iterations: number;
  finalResponse: string;
  reflection?: string;
  steps: string[];
}

const GOAL_COMPLETE_MARKER = '[GOAL_COMPLETE]';
const GOAL_STEP_DONE_MARKER = '[GOAL_STEP_DONE]';
const BLOCKED_MARKER_RE = /\[BLOCKED:\s*(.+?)\]/;

function parseSteps(text: string): string[] {
  const lines = text.split('\n');
  const steps: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*\d+[\.\)]\s*(.+)/);
    if (match) {
      steps.push(match[1].trim());
    }
  }
  return steps.length > 0 ? steps : ['Execute the goal directly'];
}

export async function runGoalLoop(options: GoalLoopOptions): Promise<GoalLoopResult> {
  const {
    process,
    agentId,
    goal,
    persona,
    memoryStore,
    eventBus,
  } = options;
  const maxIterations = options.maxIterations ?? persona.autonomy?.maxGoalIterations ?? 5;
  const goalId = randomUUID();

  // Step 1: Decompose goal into steps
  const decompositionPrompt = `Given this goal: ${goal}\n\nDecompose into concrete, actionable steps. Respond with a numbered list.`;
  const decompositionResult = await process(decompositionPrompt);
  const steps = parseSteps(decompositionResult.text);

  // Save goal record
  if (memoryStore) {
    memoryStore.saveGoal({
      agentId,
      goal,
      steps,
      status: 'active',
      iterations: 0,
    });
  }

  // Emit goal started
  eventBus?.emit({
    type: 'goal:started',
    agentId,
    goalId,
    goal,
    steps,
    timestamp: new Date(),
  });

  let currentStep = 0;
  let lastResponse = decompositionResult.text;

  // Step 2: Iterate through steps
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Recall memories if available
    let recentMemories;
    if (memoryStore) {
      const recalled = memoryStore.recall(agentId, goal, persona.memoryProtocol?.maxRecallEntries ?? 10);
      recentMemories = recalled.map(m => {
        if ('decision' in m) {
          return { type: 'decision' as const, decision: m.decision, reasoning: m.reasoning, confidence: m.confidence };
        }
        return { type: 'learning' as const, content: m.content, learningType: m.type, confidence: m.confidence };
      });
    }

    // Build dynamic system prompt
    const systemPrompt = buildSystemPrompt({
      persona,
      recentMemories,
      activeGoal: {
        goal,
        currentStep,
        totalSteps: steps.length,
        steps,
      },
    });

    const stepInstruction = currentStep < steps.length
      ? `Execute step ${currentStep + 1}: ${steps[currentStep]}`
      : 'All steps have been addressed. Evaluate if the goal is complete and respond with [GOAL_COMPLETE] if so.';

    const result = await process(stepInstruction, systemPrompt);
    lastResponse = result.text;

    // Check for markers
    if (result.text.includes(GOAL_COMPLETE_MARKER)) {
      const reflection = persona.autonomy?.reflectionEnabled
        ? result.text.replace(GOAL_COMPLETE_MARKER, '').trim()
        : undefined;

      if (memoryStore) {
        memoryStore.updateGoal(goalId, {
          status: 'completed',
          reflection,
          iterations: iteration + 1,
          completedAt: new Date(),
        });
      }

      eventBus?.emit({
        type: 'goal:completed',
        agentId,
        goalId,
        iterations: iteration + 1,
        timestamp: new Date(),
      });

      return {
        goalId,
        status: 'completed',
        iterations: iteration + 1,
        finalResponse: lastResponse,
        reflection,
        steps,
      };
    }

    const blockedMatch = result.text.match(BLOCKED_MARKER_RE);
    if (blockedMatch) {
      const reason = blockedMatch[1];

      if (memoryStore) {
        memoryStore.updateGoal(goalId, {
          status: 'blocked',
          iterations: iteration + 1,
        });
      }

      eventBus?.emit({
        type: 'goal:blocked',
        agentId,
        goalId,
        reason,
        timestamp: new Date(),
      });

      return {
        goalId,
        status: 'blocked',
        iterations: iteration + 1,
        finalResponse: lastResponse,
        steps,
      };
    }

    if (result.text.includes(GOAL_STEP_DONE_MARKER)) {
      eventBus?.emit({
        type: 'goal:step_completed',
        agentId,
        goalId,
        step: currentStep,
        totalSteps: steps.length,
        timestamp: new Date(),
      });

      currentStep++;
    }
  }

  // Max iterations reached
  if (memoryStore) {
    memoryStore.updateGoal(goalId, {
      status: 'failed',
      iterations: maxIterations,
    });
  }

  return {
    goalId,
    status: 'max_iterations',
    iterations: maxIterations,
    finalResponse: lastResponse,
    steps,
  };
}
