import type { WorkflowDefinition } from '@fluxmaster/core';

export const WORKFLOW_TEMPLATES: Record<string, WorkflowDefinition> = {
  'tdd-loop': {
    id: 'tdd-loop',
    name: 'TDD Loop',
    description: 'Test-driven development: write test, implement, run, fix until green',
    inputs: {
      requirement: { type: 'string', description: 'What to implement' },
    },
    steps: [
      {
        id: 'write-test',
        type: 'agent',
        agentId: 'tester',
        message: 'Write a failing test for this requirement: ${inputs.requirement}. Use the project\'s existing test framework and patterns. Write the test file using write_file or edit_file.',
      },
      {
        id: 'implement',
        type: 'agent',
        agentId: 'coder',
        message: 'Implement code to make the test pass. Read the test output first to understand what is expected:\n\n${write-test.output}\n\nRequirement: ${inputs.requirement}',
      },
      {
        id: 'run-tests',
        type: 'agent',
        agentId: 'tester',
        message: 'Run the tests for the code that was just implemented. Report pass/fail results.\n\nImplementation details: ${implement.output}',
      },
      {
        id: 'fix-if-needed',
        type: 'conditional',
        condition: '${run-tests.status}',
        then: [],
        else: [
          {
            id: 'fix-code',
            type: 'agent',
            agentId: 'coder',
            message: 'The tests are failing. Fix the implementation.\n\nTest results: ${run-tests.output}',
          },
        ],
      },
    ],
  },

  'code-review': {
    id: 'code-review',
    name: 'Code Review Flow',
    description: 'Implement, review, address feedback, final review',
    inputs: {
      task: { type: 'string', description: 'Coding task to complete' },
    },
    steps: [
      {
        id: 'implement',
        type: 'agent',
        agentId: 'coder',
        message: 'Implement the following task: ${inputs.task}',
      },
      {
        id: 'review',
        type: 'agent',
        agentId: 'reviewer',
        message: 'Review the code changes. Check git_diff for what changed.\n\nTask description: ${inputs.task}\nImplementation summary: ${implement.output}',
      },
      {
        id: 'address-feedback',
        type: 'agent',
        agentId: 'coder',
        message: 'Address this code review feedback:\n\n${review.output}',
      },
      {
        id: 'final-review',
        type: 'agent',
        agentId: 'reviewer',
        message: 'Final review after feedback was addressed. Check git_diff for latest changes.\n\nOriginal review: ${review.output}\nChanges made: ${address-feedback.output}',
      },
    ],
  },

  'parallel-analysis': {
    id: 'parallel-analysis',
    name: 'Parallel Analysis',
    description: 'Analyze code from multiple perspectives simultaneously',
    inputs: {
      target: { type: 'string', description: 'Code or feature to analyze' },
    },
    steps: [
      {
        id: 'analyze',
        type: 'parallel',
        steps: [
          {
            id: 'security-review',
            type: 'agent',
            agentId: 'reviewer',
            message: 'Perform a security-focused review of: ${inputs.target}. Look for vulnerabilities, injection risks, auth issues, and data exposure.',
          },
          {
            id: 'code-quality',
            type: 'agent',
            agentId: 'reviewer',
            message: 'Review code quality of: ${inputs.target}. Check complexity, readability, DRY violations, and adherence to project conventions.',
          },
          {
            id: 'test-coverage',
            type: 'agent',
            agentId: 'tester',
            message: 'Assess test coverage for: ${inputs.target}. Identify untested paths and suggest additional test cases.',
          },
        ],
      },
      {
        id: 'synthesize',
        type: 'agent',
        agentId: 'coordinator',
        message: 'Synthesize these analysis results into a unified report with prioritized action items:\n\nSecurity: ${security-review.output}\n\nQuality: ${code-quality.output}\n\nTesting: ${test-coverage.output}',
      },
    ],
  },
};

export function getWorkflowTemplate(id: string): WorkflowDefinition | undefined {
  return WORKFLOW_TEMPLATES[id];
}

export function listWorkflowTemplates(): WorkflowDefinition[] {
  return Object.values(WORKFLOW_TEMPLATES);
}
