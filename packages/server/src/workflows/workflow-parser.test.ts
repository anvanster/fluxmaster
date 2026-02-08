import { describe, it, expect } from 'vitest';
import { parseWorkflow, validateWorkflow, WorkflowParseError } from './workflow-parser.js';

const validYaml = `
id: research-pipeline
name: Research Pipeline
inputs:
  topic:
    type: string
    description: Research topic
steps:
  - id: research
    type: agent
    agentId: researcher
    message: "Research: \${topic}"
  - id: analysis
    type: parallel
    steps:
      - id: summarize
        type: agent
        agentId: writer
        message: "Summarize: \${research.output}"
      - id: critique
        type: agent
        agentId: critic
        message: "Critique: \${research.output}"
`;

describe('WorkflowParser', () => {
  describe('parseWorkflow', () => {
    it('parses valid YAML into WorkflowDefinition', () => {
      const def = parseWorkflow(validYaml);
      expect(def.id).toBe('research-pipeline');
      expect(def.name).toBe('Research Pipeline');
      expect(def.steps).toHaveLength(2);
      expect(def.steps[0].type).toBe('agent');
    });

    it('parses parallel steps', () => {
      const def = parseWorkflow(validYaml);
      const parallel = def.steps[1];
      expect(parallel.type).toBe('parallel');
      if (parallel.type === 'parallel') {
        expect(parallel.steps).toHaveLength(2);
      }
    });

    it('parses conditional steps', () => {
      const yaml = `
id: conditional-wf
name: Conditional
steps:
  - id: check
    type: conditional
    condition: "\${research.output.includes('concerns')}"
    then:
      - id: deep-review
        type: agent
        agentId: reviewer
        message: "Review concerns"
    else:
      - id: approve
        type: agent
        agentId: approver
        message: "Approved"
`;
      const def = parseWorkflow(yaml);
      expect(def.steps[0].type).toBe('conditional');
    });

    it('parses loop steps', () => {
      const yaml = `
id: loop-wf
name: Loop
steps:
  - id: iterate
    type: loop
    over: "\${topics}"
    as: topic
    maxIterations: 5
    steps:
      - id: process
        type: agent
        agentId: processor
        message: "Process \${topic}"
`;
      const def = parseWorkflow(yaml);
      expect(def.steps[0].type).toBe('loop');
      if (def.steps[0].type === 'loop') {
        expect(def.steps[0].maxIterations).toBe(5);
      }
    });

    it('throws on invalid YAML', () => {
      expect(() => parseWorkflow('{')).toThrow(WorkflowParseError);
    });

    it('throws on missing required fields', () => {
      const yaml = `
name: No ID
steps: []
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it('throws on empty steps array', () => {
      const yaml = `
id: empty
name: Empty
steps: []
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });
  });

  describe('validateWorkflow', () => {
    it('returns valid result for valid workflow', () => {
      const def = parseWorkflow(validYaml);
      const result = validateWorkflow(def);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects duplicate step IDs', () => {
      const yaml = `
id: dup
name: Duplicates
steps:
  - id: step1
    type: agent
    agentId: a1
    message: "hello"
  - id: step1
    type: agent
    agentId: a2
    message: "world"
`;
      const def = parseWorkflow(yaml);
      const result = validateWorkflow(def);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Duplicate step ID');
    });

    it('detects duplicate step IDs in nested steps', () => {
      const yaml = `
id: nested-dup
name: Nested Duplicates
steps:
  - id: outer
    type: parallel
    steps:
      - id: inner
        type: agent
        agentId: a1
        message: "hello"
      - id: inner
        type: agent
        agentId: a2
        message: "world"
`;
      const def = parseWorkflow(yaml);
      const result = validateWorkflow(def);
      expect(result.valid).toBe(false);
    });
  });
});
