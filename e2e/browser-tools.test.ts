/**
 * E2E Browser Tools Test
 *
 * Prerequisites: copilot-api proxy running on localhost:4141
 *   npx copilot-api@latest start --port 4141 --account-type individual
 *
 * Launches a real Playwright browser, registers browser tools,
 * and has an agent (GPT-4o) use them to navigate and extract content.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AuthManager } from '@fluxmaster/auth';
import { AgentManager } from '@fluxmaster/agents';
import { createDefaultRegistry, BrowserManager, createBrowserTools } from '@fluxmaster/tools';
import type { ToolRegistry } from '@fluxmaster/tools';

const MODEL = 'gpt-4o';
const TIMEOUT = 30_000;

async function isProxyRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:4141/', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function canLaunchBrowser(): Promise<boolean> {
  try {
    const bm = new BrowserManager();
    await bm.launch({ headless: true, viewport: { width: 1280, height: 720 } });
    await bm.close();
    return true;
  } catch {
    return false;
  }
}

describe('E2E: Browser Tools with Playwright', async () => {
  const proxyAvailable = await isProxyRunning();
  if (!proxyAvailable) {
    it.skip('copilot-api proxy not running on :4141 — skipping e2e', () => {});
    return;
  }

  const browserAvailable = await canLaunchBrowser();
  if (!browserAvailable) {
    it.skip('Playwright browsers not installed — run `npx playwright install chromium`', () => {});
    return;
  }

  let authManager: AuthManager;
  let agentManager: AgentManager;
  let toolRegistry: ToolRegistry;
  let browserManager: BrowserManager;

  beforeAll(async () => {
    // Launch browser
    browserManager = new BrowserManager();
    await browserManager.launch({ headless: true, viewport: { width: 1280, height: 720 } });

    // Initialize auth and tools
    authManager = new AuthManager({
      copilot: { accountType: 'individual', port: 4141 },
      preferDirectApi: false,
    });
    await authManager.initialize();

    toolRegistry = createDefaultRegistry();

    // Register browser tools
    const browserTools = createBrowserTools(browserManager);
    for (const tool of browserTools) {
      toolRegistry.register(tool);
    }

    agentManager = new AgentManager(authManager, toolRegistry);
  }, TIMEOUT);

  afterAll(async () => {
    agentManager?.killAll();
    await browserManager?.close();
    await authManager?.shutdown();
  });

  it('launches browser and page is available', () => {
    const page = browserManager.getPage();
    expect(page).toBeTruthy();
  });

  it('directly navigates and gets text', async () => {
    const navigateTool = toolRegistry.get('browser_navigate');
    const result = await navigateTool.execute({ url: 'https://example.com' });

    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('Example Domain');

    const getTextTool = toolRegistry.get('browser_get_text');
    const textResult = await getTextTool.execute({});

    expect(textResult.isError).toBeFalsy();
    expect(textResult.content).toContain('Example Domain');
  }, TIMEOUT);

  it('takes a screenshot', async () => {
    const screenshotTool = toolRegistry.get('browser_screenshot');
    const result = await screenshotTool.execute({ fullPage: false });

    expect(result.isError).toBeFalsy();
    expect(result.content).toMatch(/^data:image\/png;base64,/);
  }, TIMEOUT);

  it('agent uses browser tools to navigate and report', async () => {
    await agentManager.spawnAgent({
      id: 'browser-agent',
      model: MODEL,
      systemPrompt: [
        'You have access to browser tools: browser_navigate, browser_get_text, browser_screenshot.',
        'When asked to visit a page, use browser_navigate first, then browser_get_text to read the content.',
        'Report what you find.',
      ].join(' '),
      tools: ['browser_navigate', 'browser_get_text', 'browser_screenshot'],
      maxTokens: 256,
      temperature: 0,
    });

    const result = await agentManager.routeMessage(
      'browser-agent',
      'Navigate to https://example.com and tell me the page title and main heading.',
    );

    expect(result.text.toLowerCase()).toContain('example');
    expect(result.iterations).toBeGreaterThanOrEqual(2); // tool_use round-trip
  }, TIMEOUT);
});
