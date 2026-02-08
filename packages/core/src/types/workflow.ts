import { z } from 'zod';

// --- Status Types ---

export const WorkflowStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const StepStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'skipped']);
export type StepStatus = z.infer<typeof StepStatusSchema>;

// --- Step Types (defined manually to avoid circular inference) ---

export interface AgentStep {
  id: string;
  type: 'agent';
  agentId: string;
  message: string;
}

export interface ParallelStep {
  id: string;
  type: 'parallel';
  steps: WorkflowStep[];
}

export interface ConditionalStep {
  id: string;
  type: 'conditional';
  condition: string;
  then: WorkflowStep[];
  else?: WorkflowStep[];
}

export interface LoopStep {
  id: string;
  type: 'loop';
  over: string;
  as: string;
  maxIterations: number;
  steps: WorkflowStep[];
}

export type WorkflowStep = AgentStep | ParallelStep | ConditionalStep | LoopStep;

// --- Step Schemas (recursive via lazy + ZodType annotation) ---

// Input type differs from output when .default() is used, so we use ZodType<WorkflowStep, ZodTypeDef, unknown>
export const WorkflowStepSchema: z.ZodType<WorkflowStep, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.union([
    z.object({
      id: z.string().min(1),
      type: z.literal('agent'),
      agentId: z.string().min(1),
      message: z.string().min(1),
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal('parallel'),
      steps: z.array(WorkflowStepSchema).min(1),
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal('conditional'),
      condition: z.string().min(1),
      then: z.array(WorkflowStepSchema).min(1),
      else: z.array(WorkflowStepSchema).optional(),
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal('loop'),
      over: z.string().min(1),
      as: z.string().min(1),
      maxIterations: z.number().int().positive().default(10),
      steps: z.array(WorkflowStepSchema).min(1),
    }),
  ]),
);

// --- Workflow Input Schema ---

export const WorkflowInputSchema = z.object({
  type: z.enum(['string', 'number', 'boolean']),
  description: z.string().optional(),
  default: z.unknown().optional(),
});

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

// --- Workflow Definition Schema ---

export const WorkflowDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  inputs: z.record(WorkflowInputSchema).default({}),
  steps: z.array(WorkflowStepSchema).min(1),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// --- Run State (not schema-validated, runtime only) ---

export interface StepResult {
  stepId: string;
  status: StepStatus;
  output?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  inputs: Record<string, unknown>;
  stepResults: Record<string, StepResult>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
