import type { Persona } from '@fluxmaster/core';

export interface MemoryEntry {
  type: 'decision' | 'learning';
  decision?: string;
  reasoning?: string;
  content?: string;
  learningType?: string;
  confidence: number;
}

export interface ActiveGoal {
  goal: string;
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export interface PromptContext {
  persona: Persona;
  recentMemories?: MemoryEntry[];
  activeGoal?: ActiveGoal;
  scratchpadEntries?: Array<{ key: string; value: string }>;
  availableTools?: string[];
}

export function buildSystemPrompt(context: PromptContext): string {
  const sections: string[] = [];
  const { persona } = context;

  // 1. Identity
  const emoji = persona.identity.emoji ? `${persona.identity.emoji} ` : '';
  sections.push(`# ${emoji}${persona.identity.name} — ${persona.identity.role}`);

  // 2. Soul
  const soulLines: string[] = [];
  soulLines.push('## Core Traits');
  soulLines.push(persona.soul.coreTraits.map(t => `- ${t}`).join('\n'));
  soulLines.push('');
  soulLines.push('## Decision Framework');
  soulLines.push(persona.soul.decisionFramework);
  soulLines.push('');
  soulLines.push('## Priorities');
  soulLines.push(persona.soul.priorities.map((p, i) => `${i + 1}. ${p}`).join('\n'));

  if (persona.soul.communicationStyle) {
    soulLines.push('');
    soulLines.push('## Communication Style');
    soulLines.push(persona.soul.communicationStyle);
  }

  if (persona.soul.guidelines && persona.soul.guidelines.length > 0) {
    soulLines.push('');
    soulLines.push('## Guidelines');
    soulLines.push(persona.soul.guidelines.map(g => `- ${g}`).join('\n'));
  }

  sections.push(soulLines.join('\n'));

  // 3. Tool Guidance
  if (persona.toolPreferences) {
    const toolLines: string[] = ['## Tool Guidance'];

    if (persona.toolPreferences.preferred && persona.toolPreferences.preferred.length > 0) {
      toolLines.push('');
      toolLines.push('**Preferred Tools:** ' + persona.toolPreferences.preferred.map(t => `\`${t}\``).join(', '));
    }

    if (persona.toolPreferences.avoided && persona.toolPreferences.avoided.length > 0) {
      toolLines.push('');
      toolLines.push('**Avoided Tools:** ' + persona.toolPreferences.avoided.map(t => `\`${t}\``).join(', '));
    }

    if (persona.toolPreferences.usageHints) {
      toolLines.push('');
      toolLines.push('**Usage Hints:**');
      for (const [tool, hint] of Object.entries(persona.toolPreferences.usageHints)) {
        toolLines.push(`- \`${tool}\`: ${hint}`);
      }
    }

    sections.push(toolLines.join('\n'));
  }

  // 4. Memory Context
  if (context.recentMemories && context.recentMemories.length > 0) {
    const memLines: string[] = ['## Recent Memory'];
    for (const mem of context.recentMemories) {
      if (mem.type === 'decision') {
        memLines.push(`- **Decision** (confidence: ${mem.confidence}): ${mem.decision}`);
        if (mem.reasoning) {
          memLines.push(`  Reasoning: ${mem.reasoning}`);
        }
      } else {
        memLines.push(`- **Learning** [${mem.learningType}] (confidence: ${mem.confidence}): ${mem.content}`);
      }
    }
    sections.push(memLines.join('\n'));
  }

  // 5. Shared Context (Scratchpad)
  if (context.scratchpadEntries && context.scratchpadEntries.length > 0) {
    const scratchLines: string[] = ['## Shared Context'];
    for (const entry of context.scratchpadEntries) {
      scratchLines.push(`- **${entry.key}**: ${entry.value}`);
    }
    sections.push(scratchLines.join('\n'));
  }

  // 6. Active Goal
  if (context.activeGoal) {
    const { goal, currentStep, totalSteps, steps } = context.activeGoal;
    const goalLines: string[] = ['## Active Goal'];
    goalLines.push(`**Goal:** ${goal}`);
    goalLines.push(`**Progress:** Step ${currentStep + 1} of ${totalSteps}`);
    goalLines.push('');
    goalLines.push('**Steps:**');
    steps.forEach((step, i) => {
      const marker = i < currentStep ? '✓' : i === currentStep ? '→' : '○';
      goalLines.push(`${marker} ${i + 1}. ${step}`);
    });
    goalLines.push('');
    goalLines.push('**Response markers:**');
    goalLines.push('- Include `[GOAL_STEP_DONE]` when the current step is complete');
    goalLines.push('- Include `[GOAL_COMPLETE]` when the entire goal is achieved');
    goalLines.push('- Include `[BLOCKED: reason]` if you cannot proceed');
    sections.push(goalLines.join('\n'));
  }

  // 7. Autonomy Instructions
  if (persona.autonomy) {
    const autoLines: string[] = ['## Autonomy'];
    autoLines.push(`- Confidence threshold: ${persona.autonomy.confidenceThreshold}`);
    if (persona.autonomy.reflectionEnabled) {
      autoLines.push('- Reflect on outcomes after completing tasks');
    }
    if (persona.autonomy.autoDecompose) {
      autoLines.push('- Automatically decompose complex goals into steps');
    }
    if (persona.autonomy.canSelfAssign) {
      autoLines.push('- You may self-assign follow-up tasks when appropriate');
    }
    sections.push(autoLines.join('\n'));
  }

  return sections.join('\n\n');
}
