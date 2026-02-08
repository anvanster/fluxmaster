import type { StepResult } from '@fluxmaster/core';

export class VariableResolver {
  private inputs: Record<string, unknown>;
  private stepResults: Record<string, StepResult>;
  private loopVars: Record<string, unknown>;

  constructor(
    inputs: Record<string, unknown>,
    stepResults: Record<string, StepResult>,
    loopVars: Record<string, unknown> = {},
  ) {
    this.inputs = inputs;
    this.stepResults = stepResults;
    this.loopVars = loopVars;
  }

  resolve(template: string): string {
    return template.replace(/\$\{([^}]+)\}/g, (_match, expr: string) => {
      const value = this.evaluateExpression(expr.trim());
      if (value === undefined) return _match; // leave unresolvable as-is
      return String(value);
    });
  }

  private evaluateExpression(expr: string): unknown {
    // Check loop variables first (highest priority)
    if (expr in this.loopVars) {
      return this.loopVars[expr];
    }

    // Check inputs
    if (expr in this.inputs) {
      return this.inputs[expr];
    }

    // Check step results: "stepId.output" pattern
    const dotIdx = expr.indexOf('.');
    if (dotIdx > 0) {
      const stepId = expr.substring(0, dotIdx);
      const property = expr.substring(dotIdx + 1);
      const result = this.stepResults[stepId];
      if (result && property === 'output') {
        return result.output;
      }
      if (result && property === 'error') {
        return result.error;
      }
      if (result && property === 'status') {
        return result.status;
      }
    }

    return undefined;
  }
}
