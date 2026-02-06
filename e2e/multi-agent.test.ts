/**
 * E2E Multi-Agent Test
 *
 * Prerequisites: copilot-api proxy running on localhost:4141
 *   npx copilot-api@latest start --port 4141 --account-type individual
 *
 * Uses real Copilot proxy → GPT-4o to exercise:
 * 1. AuthManager initialization with Copilot
 * 2. Spawning multiple agents
 * 3. Routing messages to different agents
 * 4. Inter-agent delegation via delegate_to_agent tool
 * 5. Agent lifecycle (spawn, list, kill)
 * 6. Session history (clear, re-ask)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AuthManager } from '@fluxmaster/auth';
import { AgentManager } from '@fluxmaster/agents';
import { createDefaultRegistry } from '@fluxmaster/tools';
import { createDelegateTool } from '@fluxmaster/agents';
import type { ToolRegistry } from '@fluxmaster/tools';

const MODEL = 'gpt-4o';
const TIMEOUT = 30_000;

// Skip all tests if proxy isn't running
async function isProxyRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:4141/', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('E2E: Multi-Agent with Copilot + GPT-4o', async () => {
  const proxyAvailable = await isProxyRunning();
  if (!proxyAvailable) {
    it.skip('copilot-api proxy not running on :4141 — skipping e2e', () => {});
    return;
  }

  let authManager: AuthManager;
  let agentManager: AgentManager;
  let toolRegistry: ToolRegistry;

  beforeAll(async () => {
    authManager = new AuthManager({
      copilot: { accountType: 'individual', port: 4141 },
      preferDirectApi: false,
    });
    await authManager.initialize();
    toolRegistry = createDefaultRegistry();
  }, TIMEOUT);

  afterAll(async () => {
    agentManager?.killAll();
    await authManager?.shutdown();
  });

  it('resolves a Copilot endpoint for gpt-4o', async () => {
    const endpoint = await authManager.getEndpoint(MODEL);
    expect(endpoint).toBeDefined();
    expect(endpoint.baseUrl).toContain('localhost');
    expect(endpoint.apiKey).toBeTruthy();
  }, TIMEOUT);

  describe('single agent', () => {
    beforeAll(async () => {
      agentManager = new AgentManager(authManager, toolRegistry);
      await agentManager.spawnAgent({
        id: 'assistant',
        model: MODEL,
        systemPrompt: 'You are a concise assistant. Answer in one short sentence.',
        tools: [],
        maxTokens: 256,
        temperature: 0,
      });
    }, TIMEOUT);

    afterAll(() => {
      agentManager?.killAll();
    });

    it('routes a simple message and gets a response', async () => {
      const result = await agentManager.routeMessage('assistant', 'What is 2 + 2? Reply with just the number.');

      expect(result.text).toBeTruthy();
      expect(result.text).toContain('4');
      expect(result.usage.inputTokens).toBeGreaterThan(0);
      expect(result.usage.outputTokens).toBeGreaterThan(0);
      expect(result.iterations).toBe(1);
    }, TIMEOUT);

    it('maintains conversation history across messages', async () => {
      await agentManager.routeMessage('assistant', 'The answer to the magic question is exactly "ZEBRA42". Confirm you understood by repeating it.');
      const result = await agentManager.routeMessage('assistant', 'What is the answer to the magic question? Repeat the exact answer.');

      expect(result.text).toContain('ZEBRA42');
    }, TIMEOUT);

    it('clears history when requested', async () => {
      const worker = agentManager.getAgent('assistant')!;
      worker.clearHistory();

      const result = await agentManager.routeMessage(
        'assistant',
        'What is the answer to the magic question? If you don\'t know, respond with exactly "NO_CONTEXT".',
      );
      // After clearing, the model should not know ZEBRA42
      expect(result.text).not.toContain('ZEBRA42');
    }, TIMEOUT);
  });

  describe('multi-agent routing', () => {
    beforeAll(async () => {
      toolRegistry = createDefaultRegistry();
      agentManager = new AgentManager(authManager, toolRegistry);

      await agentManager.spawnAgent({
        id: 'math',
        model: MODEL,
        systemPrompt: 'You are a math assistant. Answer only with the numeric result, nothing else.',
        tools: [],
        maxTokens: 64,
        temperature: 0,
      });

      await agentManager.spawnAgent({
        id: 'translator',
        model: MODEL,
        systemPrompt: 'You are a French translator. Reply only with the French translation, nothing else.',
        tools: [],
        maxTokens: 128,
        temperature: 0,
      });
    }, TIMEOUT);

    afterAll(() => {
      agentManager?.killAll();
    });

    it('lists multiple agents', () => {
      const agents = agentManager.listAgents();
      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.id)).toEqual(expect.arrayContaining(['math', 'translator']));
    });

    it('routes to math agent', async () => {
      const result = await agentManager.routeMessage('math', 'What is 15 * 7?');
      expect(result.text).toContain('105');
    }, TIMEOUT);

    it('routes to translator agent', async () => {
      const result = await agentManager.routeMessage('translator', 'Hello, how are you?');
      expect(result.text.toLowerCase()).toMatch(/bonjour|salut|comment|ça va/);
    }, TIMEOUT);

    it('kills an agent and verifies removal', () => {
      agentManager.killAgent('translator');
      expect(agentManager.listAgents()).toHaveLength(1);
      expect(agentManager.getAgent('translator')).toBeUndefined();
    });
  });

  describe('inter-agent delegation', () => {
    beforeAll(async () => {
      toolRegistry = createDefaultRegistry();
      agentManager = new AgentManager(authManager, toolRegistry);

      // Register delegate tool
      const delegateTool = createDelegateTool(agentManager);
      toolRegistry.register(delegateTool);

      // Calculator — answers math only
      await agentManager.spawnAgent({
        id: 'calculator',
        model: MODEL,
        systemPrompt: 'You are a calculator. Answer only with the numeric result, nothing else.',
        tools: [],
        maxTokens: 64,
        temperature: 0,
      });

      // Orchestrator — delegates math to calculator
      await agentManager.spawnAgent({
        id: 'orchestrator',
        model: MODEL,
        systemPrompt: [
          'You are an orchestrator.',
          'When the user asks a math question, you MUST use the delegate_to_agent tool to ask the "calculator" agent.',
          'Then return the calculator\'s answer to the user.',
        ].join(' '),
        tools: ['delegate_to_agent'],
        maxTokens: 256,
        temperature: 0,
      });
    }, TIMEOUT);

    afterAll(() => {
      agentManager?.killAll();
    });

    it('orchestrator delegates math to calculator via tool', async () => {
      const result = await agentManager.routeMessage(
        'orchestrator',
        'What is 42 * 13? Use the delegate_to_agent tool to ask the calculator.',
      );

      expect(result.text).toContain('546');
      // tool_use round-trip: send → tool_use → tool_result → end_turn = 2+ iterations
      expect(result.iterations).toBeGreaterThanOrEqual(2);
    }, TIMEOUT);
  });
});
