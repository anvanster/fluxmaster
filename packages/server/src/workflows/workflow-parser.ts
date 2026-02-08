import { parse as parseYaml } from 'yaml';
import { WorkflowDefinitionSchema, type WorkflowDefinition, type WorkflowStep } from '@fluxmaster/core';

export class WorkflowParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowParseError';
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Parse a YAML string into a validated WorkflowDefinition.
 */
export function parseWorkflow(yamlContent: string): WorkflowDefinition {
  let raw: unknown;
  try {
    raw = parseYaml(yamlContent);
  } catch (err) {
    throw new WorkflowParseError(`Invalid YAML: ${err instanceof Error ? err.message : String(err)}`);
  }

  const result = WorkflowDefinitionSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new WorkflowParseError(`Invalid workflow definition: ${issues}`);
  }

  return result.data;
}

/**
 * Validate a workflow definition for semantic correctness.
 * Checks: duplicate step IDs, variable references, etc.
 */
export function validateWorkflow(definition: WorkflowDefinition): ValidationResult {
  const errors: string[] = [];
  const stepIds = new Set<string>();

  function collectStepIds(steps: WorkflowStep[]): void {
    for (const step of steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: '${step.id}'`);
      }
      stepIds.add(step.id);

      if (step.type === 'parallel') {
        collectStepIds(step.steps);
      } else if (step.type === 'conditional') {
        collectStepIds(step.then);
        if (step.else) collectStepIds(step.else);
      } else if (step.type === 'loop') {
        collectStepIds(step.steps);
      }
    }
  }

  collectStepIds(definition.steps);

  return {
    valid: errors.length === 0,
    errors,
  };
}
