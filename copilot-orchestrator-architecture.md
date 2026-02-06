# Copilot Multi-Agent Orchestrator Architecture

## Project Overview

A simplified orchestrator inspired by OpenClaw, designed to work with GitHub Copilot enterprise authentication and support multi-agent workflows with MCP server integration and web browsing capabilities.

---

## OpenClaw Architecture Summary

Based on research, OpenClaw consists of these core components:

### Core Components

1. **Gateway (Control Plane)**
   - WebSocket-based control plane running on `ws://127.0.0.1:18789`
   - Routes messages, manages sessions, coordinates agents
   - Handles channel connections (Slack, Discord, Telegram, etc.)
   - Written in TypeScript/Node.js

2. **Pi Agent Runtime**
   - The actual AI agent execution layer
   - Handles reasoning loop, memory, plugins, and skills
   - Tool invocation and workflow orchestration
   - Session management with context persistence

3. **Skills/Plugin System**
   - Extensible tool layer loaded into Agent Runtime
   - Workspace skills in `~/.openclaw/workspace/skills/`
   - MCP integration via `mcporter` (external CLI tool)

4. **MCP Support** (via mcporter)
   - OpenClaw doesn't have native MCP support in Pi
   - Uses `mcporter` to expose MCP calls via CLI or TypeScript bindings
   - Configuration in `mcp_config.json`

---

## Your Simplified Orchestrator: "Fluxmaster"

Following your metalworking naming convention, I propose **"Fluxmaster"** - a multi-agent orchestrator.

### Design Goals

1. **Simpler than OpenClaw** - Focus on core orchestration, not multi-channel inbox
2. **GitHub Copilot integration** - Use `copilot-api` for authentication
3. **Multi-agent support** - Spawn and coordinate multiple agents
4. **MCP server connectivity** - Native MCP client support
5. **Web browsing** - Browser automation via Playwright/Puppeteer
6. **OpenClaw compatibility** - Modular design for future skill porting

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Fluxmaster Orchestrator                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │   Copilot Auth   │     │         Agent Manager            │  │
│  │   (copilot-api)  │────▶│  - Spawn agents                  │  │
│  │                  │     │  - Route messages                │  │
│  │  - OAuth flow    │     │  - Session isolation             │  │
│  │  - Token refresh │     │  - Model selection               │  │
│  └──────────────────┘     └──────────────────────────────────┘  │
│                                    │                             │
│                                    ▼                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Agent Workers                            ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │  Agent 1    │  │  Agent 2    │  │  Agent N    │         ││
│  │  │ (Sonnet 4)  │  │ (GPT-5.2)   │  │ (Claude Opus)│        ││
│  │  │             │  │             │  │             │          ││
│  │  │ - Session   │  │ - Session   │  │ - Session   │          ││
│  │  │ - Tools     │  │ - Tools     │  │ - Tools     │          ││
│  │  │ - Context   │  │ - Context   │  │ - Context   │          ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          ││
│  └─────────┼────────────────┼────────────────┼─────────────────┘│
│            │                │                │                   │
│            └────────────────┴────────────────┘                   │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Tool Layer                              ││
│  │                                                              ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       ││
│  │  │  MCP Client  │  │   Browser    │  │  File System │       ││
│  │  │              │  │  (Playwright)│  │              │       ││
│  │  │ - Server mgmt│  │              │  │ - Read/Write │       ││
│  │  │ - Tool proxy │  │ - Navigate   │  │ - Edit       │       ││
│  │  │ - Stdio/SSE  │  │ - Scrape     │  │ - Execute    │       ││
│  │  └──────────────┘  │ - Interact   │  └──────────────┘       ││
│  │                    └──────────────┘                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Authentication Layer (GitHub Copilot Primary)

Fluxmaster uses **GitHub Copilot** as the primary authentication mechanism. This gives you access to multiple models (Claude, GPT, Gemini) through a single enterprise login.

#### Why Copilot-First?

| Benefit | Description |
|---------|-------------|
| **Single Auth** | One login for all models (Claude, GPT-5.x, Gemini) |
| **Enterprise Compliant** | Uses your company's existing Copilot subscription |
| **No ToS Issues** | Unlike Claude Code OAuth, this is the intended use |
| **Model Flexibility** | Switch between providers without re-authenticating |

#### Primary: GitHub Copilot Authentication

Use the `copilot-api` project to expose Copilot as an OpenAI/Anthropic-compatible API:

```typescript
// src/auth/copilot-auth.ts
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface CopilotConfig {
  accountType: 'individual' | 'business' | 'enterprise';
  githubToken?: string;  // Optional: provide directly via GH_TOKEN
  port: number;          // API server port (default: 4141)
  rateLimit?: number;    // Seconds between requests (optional)
}

// Models available through GitHub Copilot (varies by plan)
const COPILOT_MODELS = {
  // OpenAI models
  'gpt-4.1': { id: 'gpt-4.1', provider: 'openai' },
  'gpt-5': { id: 'gpt-5', provider: 'openai' },
  'gpt-5-mini': { id: 'gpt-5-mini', provider: 'openai' },
  'gpt-5.1-codex': { id: 'gpt-5.1-codex', provider: 'openai' },
  'gpt-5.2-codex': { id: 'gpt-5.2-codex', provider: 'openai' },
  
  // Anthropic models (via Copilot - requires Business/Enterprise)
  'claude-sonnet-4': { id: 'claude-sonnet-4', provider: 'anthropic' },
  'claude-opus-4': { id: 'claude-opus-4', provider: 'anthropic' },
  'claude-opus-4.5': { id: 'claude-opus-4.5', provider: 'anthropic' },
  'claude-haiku-4.5': { id: 'claude-haiku-4.5', provider: 'anthropic' },
  
  // Google models
  'gemini-3-pro': { id: 'gemini-3-pro', provider: 'google' },
  'gemini-3-flash': { id: 'gemini-3-flash', provider: 'google' },
  
  // xAI models
  'grok-4.1-fast': { id: 'grok-4.1-fast', provider: 'xai' },
} as const;

class CopilotAuthProvider {
  private config: CopilotConfig;
  private process?: ChildProcess;
  private ready: boolean = false;
  
  constructor(config: CopilotConfig) {
    this.config = {
      port: 4141,
      accountType: 'enterprise',
      ...config,
    };
  }
  
  async initialize(): Promise<void> {
    // Check if copilot-api is already running
    if (await this.checkHealth()) {
      console.log('Copilot API proxy already running');
      this.ready = true;
      return;
    }
    
    // Start the proxy
    await this.startProxy();
  }
  
  private async startProxy(): Promise<void> {
    const args = [
      'copilot-api@latest',
      'start',
      '--account-type', this.config.accountType,
      '--port', String(this.config.port),
    ];
    
    if (this.config.rateLimit) {
      args.push('--rate-limit', String(this.config.rateLimit));
      args.push('--wait'); // Wait instead of error on rate limit
    }
    
    const env: Record<string, string> = { ...process.env };
    if (this.config.githubToken) {
      env.GH_TOKEN = this.config.githubToken;
    }
    
    console.log(`Starting Copilot API proxy on port ${this.config.port}...`);
    
    this.process = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      detached: false,
    });
    
    // Log output for debugging
    this.process.stdout?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[copilot-api] ${msg}`);
    });
    
    this.process.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.error(`[copilot-api] ${msg}`);
    });
    
    this.process.on('exit', (code) => {
      this.ready = false;
      if (code !== 0) {
        console.error(`Copilot API proxy exited with code ${code}`);
      }
    });
    
    // Wait for server to be ready
    await this.waitForReady();
    this.ready = true;
  }
  
  private async waitForReady(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.checkHealth()) {
        console.log('Copilot API proxy is ready');
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('Copilot API proxy failed to start within 30 seconds');
  }
  
  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.config.port}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  getEndpoint(): { baseUrl: string; apiKey: string } {
    if (!this.ready) {
      throw new Error('Copilot API proxy not ready');
    }
    return {
      baseUrl: `http://localhost:${this.config.port}`,
      apiKey: 'dummy', // copilot-api handles real auth
    };
  }
  
  isModelAvailable(model: string): boolean {
    return model in COPILOT_MODELS;
  }
  
  async shutdown(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = undefined;
      this.ready = false;
    }
  }
}

export { CopilotAuthProvider, CopilotConfig, COPILOT_MODELS };
```

**Setup Commands:**

```bash
# First time: GitHub OAuth flow (opens browser)
npx copilot-api@latest auth

# Start proxy with enterprise account
npx copilot-api@latest start --account-type enterprise --port 4141

# Or provide token directly
GH_TOKEN=ghp_xxx npx copilot-api@latest start --account-type enterprise

# Check usage/quota
npx copilot-api@latest check-usage
```

**Docker Deployment:**

```bash
# Build or pull
docker build -t copilot-api .

# Run with persistent auth
docker run -d \
  --name copilot-api \
  -p 4141:4141 \
  -v $(pwd)/copilot-data:/root/.local/share/copilot-api \
  copilot-api start --account-type enterprise

# Or with token from env
docker run -d \
  --name copilot-api \
  -p 4141:4141 \
  -e GH_TOKEN=${GITHUB_TOKEN} \
  copilot-api start --account-type enterprise
```

---

#### Secondary: Direct API Keys (Fallback)

For cases where Copilot doesn't have a specific model, or for direct API access:

```typescript
// src/auth/direct-api.ts
interface DirectApiConfig {
  anthropic?: {
    apiKey: string;
    baseUrl?: string;
  };
  openai?: {
    apiKey: string;
    baseUrl?: string;
  };
  google?: {
    apiKey: string;
  };
}

class DirectApiProvider {
  private config: DirectApiConfig;
  
  constructor() {
    this.config = {
      anthropic: process.env.ANTHROPIC_API_KEY ? {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
      } : undefined,
      openai: process.env.OPENAI_API_KEY ? {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
      } : undefined,
      google: process.env.GOOGLE_API_KEY ? {
        apiKey: process.env.GOOGLE_API_KEY,
      } : undefined,
    };
  }
  
  hasProvider(provider: 'anthropic' | 'openai' | 'google'): boolean {
    return this.config[provider] !== undefined;
  }
  
  getEndpoint(provider: 'anthropic' | 'openai' | 'google'): { baseUrl: string; apiKey: string } {
    const config = this.config[provider];
    if (!config) {
      throw new Error(`No API key configured for ${provider}`);
    }
    
    const baseUrls = {
      anthropic: 'https://api.anthropic.com',
      openai: 'https://api.openai.com/v1',
      google: 'https://generativelanguage.googleapis.com',
    };
    
    return {
      baseUrl: config.baseUrl || baseUrls[provider],
      apiKey: config.apiKey,
    };
  }
}

export { DirectApiProvider, DirectApiConfig };
```

---

#### Unified Auth Manager

```typescript
// src/auth/auth-manager.ts
import { CopilotAuthProvider, CopilotConfig, COPILOT_MODELS } from './copilot-auth';
import { DirectApiProvider } from './direct-api';

interface ModelEndpoint {
  model: string;
  baseUrl: string;
  apiKey: string;
  provider: 'copilot' | 'anthropic' | 'openai' | 'google';
}

interface AuthManagerConfig {
  copilot: CopilotConfig;
  preferDirectApi?: boolean;  // Use direct API keys when available
}

class AuthManager {
  private copilot: CopilotAuthProvider;
  private directApi: DirectApiProvider;
  private config: AuthManagerConfig;
  
  constructor(config: AuthManagerConfig) {
    this.config = config;
    this.copilot = new CopilotAuthProvider(config.copilot);
    this.directApi = new DirectApiProvider();
  }
  
  async initialize(): Promise<void> {
    await this.copilot.initialize();
  }
  
  async getEndpoint(model: string): Promise<ModelEndpoint> {
    // Determine the model's native provider
    const modelInfo = COPILOT_MODELS[model as keyof typeof COPILOT_MODELS];
    const nativeProvider = modelInfo?.provider || this.inferProvider(model);
    
    // Option 1: Use direct API if configured and preferred
    if (this.config.preferDirectApi && 
        this.directApi.hasProvider(nativeProvider as any)) {
      const endpoint = this.directApi.getEndpoint(nativeProvider as any);
      return {
        model: this.getFullModelId(model),
        ...endpoint,
        provider: nativeProvider as any,
      };
    }
    
    // Option 2: Use Copilot proxy (primary path)
    if (this.copilot.isModelAvailable(model)) {
      const endpoint = this.copilot.getEndpoint();
      return {
        model,
        ...endpoint,
        provider: 'copilot',
      };
    }
    
    // Option 3: Fall back to direct API
    if (this.directApi.hasProvider(nativeProvider as any)) {
      const endpoint = this.directApi.getEndpoint(nativeProvider as any);
      return {
        model: this.getFullModelId(model),
        ...endpoint,
        provider: nativeProvider as any,
      };
    }
    
    throw new Error(`No auth provider available for model: ${model}`);
  }
  
  private inferProvider(model: string): string {
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
    if (model.startsWith('gemini')) return 'google';
    return 'unknown';
  }
  
  private getFullModelId(model: string): string {
    // Map short names to full model IDs for direct API calls
    const fullIds: Record<string, string> = {
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
      'claude-opus-4': 'claude-opus-4-20250514',
      'claude-opus-4.5': 'claude-opus-4-5-20251101',
      'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
    };
    return fullIds[model] || model;
  }
  
  async shutdown(): Promise<void> {
    await this.copilot.shutdown();
  }
}

export { AuthManager, AuthManagerConfig, ModelEndpoint };
```

---

#### Auth Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Model Request: "claude-sonnet-4"             │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Is preferDirectApi=true AND ANTHROPIC_API_KEY set?          │
│     → YES: Use Anthropic direct API (pay-per-token)             │
│     → NO: Continue to Copilot                                   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Is Copilot proxy running?                                   │
│     → YES: Route through copilot-api (uses enterprise quota)    │
│     → NO: Try to start it, or fall back to direct API           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Copilot started successfully?                               │
│     → YES: Use Copilot endpoint                                 │
│     → NO: Check for direct API key fallback                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. No auth available                                           │
│     → Error: "Run 'Fluxmaster auth' to configure authentication"     │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Model Availability by Copilot Plan

| Model | Individual | Business | Enterprise |
|-------|:----------:|:--------:|:----------:|
| GPT-4.1 | ✅ | ✅ | ✅ |
| GPT-5 / GPT-5.2-Codex | ✅ | ✅ | ✅ |
| Claude Sonnet 4 | ❌ | ✅ | ✅ |
| Claude Opus 4.5 | ❌ | ✅* | ✅ |
| Gemini 3 Pro/Flash | ✅ | ✅ | ✅ |
| Grok 4.1 Fast | ✅ | ✅ | ✅ |

*Requires admin opt-in via Copilot settings policy

---

#### Environment Variables

```bash
# Required for Copilot (or use interactive auth)
GH_TOKEN=ghp_xxxxx              # GitHub personal access token

# Optional: Direct API fallbacks
ANTHROPIC_API_KEY=sk-ant-xxx    # For direct Anthropic API (bypasses Copilot)
OPENAI_API_KEY=sk-xxx           # For direct OpenAI API
GOOGLE_API_KEY=xxx              # For direct Gemini API

# Optional: Custom endpoints (for proxies/self-hosted)
ANTHROPIC_BASE_URL=https://api.anthropic.com
OPENAI_BASE_URL=https://api.openai.com/v1
```

### 2. Agent Manager

The core orchestration component:

```typescript
// src/agents/agent-manager.ts
interface AgentConfig {
  id: string;
  model: keyof typeof COPILOT_MODELS;
  systemPrompt?: string;
  tools: string[];        // Tool IDs to enable
  mcpServers?: MCPServerConfig[];
  maxTokens?: number;
  temperature?: number;
}

interface AgentSession {
  id: string;
  agent: AgentConfig;
  messages: Message[];
  state: Map<string, unknown>;
  createdAt: Date;
  lastActiveAt: Date;
}

class AgentManager {
  private agents: Map<string, AgentWorker> = new Map();
  private sessions: Map<string, AgentSession> = new Map();
  
  async spawnAgent(config: AgentConfig): Promise<AgentWorker> {
    const worker = new AgentWorker(config, {
      baseUrl: `http://localhost:${COPILOT_PORT}`,
      apiKey: 'dummy',  // copilot-api handles auth
    });
    
    await worker.initialize();
    this.agents.set(config.id, worker);
    return worker;
  }
  
  async routeMessage(agentId: string, message: string): Promise<string> {
    const worker = this.agents.get(agentId);
    if (!worker) throw new Error(`Agent ${agentId} not found`);
    return worker.process(message);
  }
  
  async broadcastToAll(message: string): Promise<Map<string, string>> {
    const results = new Map();
    for (const [id, worker] of this.agents) {
      results.set(id, await worker.process(message));
    }
    return results;
  }
}
```

### 3. Agent Worker

Individual agent implementation:

```typescript
// src/agents/agent-worker.ts
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

class AgentWorker {
  private config: AgentConfig;
  private client: Anthropic | OpenAI;
  private tools: Tool[] = [];
  private mcpClients: MCPClient[] = [];
  
  constructor(config: AgentConfig, endpoint: ModelEndpoint) {
    this.config = config;
    
    // Use appropriate SDK based on model
    if (config.model.startsWith('claude')) {
      this.client = new Anthropic({
        baseURL: endpoint.baseUrl,
        apiKey: endpoint.apiKey,
      });
    } else {
      this.client = new OpenAI({
        baseURL: endpoint.baseUrl,
        apiKey: endpoint.apiKey,
      });
    }
  }
  
  async initialize(): Promise<void> {
    // Initialize MCP servers
    for (const serverConfig of this.config.mcpServers || []) {
      const mcpClient = new MCPClient(serverConfig);
      await mcpClient.connect();
      this.mcpClients.push(mcpClient);
      
      // Register MCP tools
      const mcpTools = await mcpClient.listTools();
      this.tools.push(...mcpTools);
    }
    
    // Add built-in tools
    this.tools.push(...getBuiltinTools(this.config.tools));
  }
  
  async process(userMessage: string): Promise<string> {
    // Implementation depends on which SDK
    if (this.client instanceof Anthropic) {
      return this.processWithAnthropic(userMessage);
    } else {
      return this.processWithOpenAI(userMessage);
    }
  }
  
  private async processWithAnthropic(message: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens || 4096,
      system: this.config.systemPrompt,
      tools: this.tools.map(t => t.toAnthropicFormat()),
      messages: [{ role: 'user', content: message }],
    });
    
    // Handle tool calls
    return this.handleToolCalls(response);
  }
}
```

### 4. MCP Client

Native MCP support (not via mcporter):

```typescript
// src/mcp/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'sse';
  command?: string;      // For stdio
  args?: string[];       // For stdio
  url?: string;          // For SSE
  env?: Record<string, string>;
}

class MCPClient {
  private client: Client;
  private config: MCPServerConfig;
  private tools: Tool[] = [];
  
  constructor(config: MCPServerConfig) {
    this.config = config;
    this.client = new Client({
      name: 'fluxmaster-orchestrator',
      version: '1.0.0',
    });
  }
  
  async connect(): Promise<void> {
    let transport;
    
    if (this.config.transport === 'stdio') {
      transport = new StdioClientTransport({
        command: this.config.command!,
        args: this.config.args || [],
        env: { ...process.env, ...this.config.env },
      });
    } else {
      transport = new SSEClientTransport(new URL(this.config.url!));
    }
    
    await this.client.connect(transport);
    
    // List available tools
    const toolsResult = await this.client.listTools();
    this.tools = toolsResult.tools.map(t => ({
      name: `${this.config.name}/${t.name}`,
      description: t.description,
      inputSchema: t.inputSchema,
      execute: (args) => this.callTool(t.name, args),
    }));
  }
  
  async callTool(name: string, args: unknown): Promise<unknown> {
    const result = await this.client.callTool({ name, arguments: args });
    return result.content;
  }
  
  async listTools(): Promise<Tool[]> {
    return this.tools;
  }
}
```

### 5. Browser Tool (Playwright)

```typescript
// src/tools/browser.ts
import { chromium, Browser, Page } from 'playwright';

interface BrowserToolConfig {
  headless?: boolean;
  userDataDir?: string;
  viewport?: { width: number; height: number };
}

class BrowserTool {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: BrowserToolConfig;
  
  constructor(config: BrowserToolConfig = {}) {
    this.config = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      ...config,
    };
  }
  
  async launch(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
    });
    const context = await this.browser.newContext({
      viewport: this.config.viewport,
    });
    this.page = await context.newPage();
  }
  
  // Tool implementations
  async navigate(url: string): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.goto(url, { waitUntil: 'networkidle' });
    return `Navigated to ${url}`;
  }
  
  async getContent(): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');
    return this.page.content();
  }
  
  async getText(): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');
    return this.page.innerText('body');
  }
  
  async click(selector: string): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.click(selector);
    return `Clicked ${selector}`;
  }
  
  async fill(selector: string, value: string): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.fill(selector, value);
    return `Filled ${selector} with value`;
  }
  
  async screenshot(): Promise<Buffer> {
    if (!this.page) throw new Error('Browser not launched');
    return this.page.screenshot();
  }
  
  async evaluate(script: string): Promise<unknown> {
    if (!this.page) throw new Error('Browser not launched');
    return this.page.evaluate(script);
  }
  
  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }
  
  // Convert to tool format for agents
  toTools(): Tool[] {
    return [
      {
        name: 'browser_navigate',
        description: 'Navigate to a URL',
        inputSchema: {
          type: 'object',
          properties: { url: { type: 'string' } },
          required: ['url'],
        },
        execute: async (args: { url: string }) => this.navigate(args.url),
      },
      {
        name: 'browser_get_text',
        description: 'Get text content of current page',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => this.getText(),
      },
      {
        name: 'browser_click',
        description: 'Click an element by CSS selector',
        inputSchema: {
          type: 'object',
          properties: { selector: { type: 'string' } },
          required: ['selector'],
        },
        execute: async (args: { selector: string }) => this.click(args.selector),
      },
      {
        name: 'browser_fill',
        description: 'Fill a form field',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            value: { type: 'string' },
          },
          required: ['selector', 'value'],
        },
        execute: async (args) => this.fill(args.selector, args.value),
      },
      {
        name: 'browser_screenshot',
        description: 'Take a screenshot of current page',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          const buffer = await this.screenshot();
          return { type: 'image', data: buffer.toString('base64') };
        },
      },
    ];
  }
}
```

---

## Configuration File

```json
// fluxmaster.config.json
{
  // Primary: GitHub Copilot authentication
  "auth": {
    "copilot": {
      "accountType": "enterprise",  // "individual" | "business" | "enterprise"
      "port": 4141,
      "rateLimit": null             // Optional: seconds between requests
    },
    "preferDirectApi": false        // Set true to prefer API keys over Copilot
  },
  "agents": {
    "defaults": {
      "maxTokens": 8192,
      "temperature": 0.7
    },
    "list": [
      {
        "id": "coder",
        "model": "claude-sonnet-4",
        "systemPrompt": "You are a skilled software engineer...",
        "tools": ["filesystem", "bash", "browser"],
        "mcpServers": [
          {
            "name": "github",
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {
              "GITHUB_TOKEN": "${GITHUB_TOKEN}"
            }
          }
        ]
      },
      {
        "id": "researcher",
        "model": "gpt-5.2-codex",
        "systemPrompt": "You are a research assistant...",
        "tools": ["browser", "filesystem"]
      },
      {
        "id": "reviewer",
        "model": "claude-opus-4.5",
        "systemPrompt": "You are a senior code reviewer...",
        "tools": ["filesystem"]
      }
    ]
  },
  "mcpServers": {
    "global": [
      {
        "name": "filesystem",
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "./workspace"]
      }
    ]
  },
  "browser": {
    "headless": true,
    "userDataDir": "./.fluxmaster/browser-data"
  }
}
```

---

## Project Structure

```
fluxmaster/
├── package.json
├── tsconfig.json
├── fluxmaster.config.json
├── src/
│   ├── index.ts              # Main entry point
│   ├── cli.ts                # CLI interface
│   ├── auth/
│   │   └── copilot-auth.ts   # Copilot authentication
│   ├── agents/
│   │   ├── agent-manager.ts  # Agent orchestration
│   │   ├── agent-worker.ts   # Individual agent
│   │   └── session.ts        # Session management
│   ├── mcp/
│   │   ├── mcp-client.ts     # MCP client
│   │   └── mcp-registry.ts   # Server registry
│   ├── tools/
│   │   ├── browser.ts        # Browser automation
│   │   ├── filesystem.ts     # File operations
│   │   ├── bash.ts           # Shell execution
│   │   └── index.ts          # Tool registry
│   └── utils/
│       ├── config.ts         # Config loader
│       └── logger.ts         # Logging
├── skills/                   # OpenClaw-compatible skills
│   └── .gitkeep
└── workspace/                # Agent workspace
    └── .gitkeep
```

---

## OpenClaw Compatibility Layer

To support future porting of OpenClaw skills:

```typescript
// src/compat/openclaw-skill.ts
interface OpenClawSkill {
  name: string;
  description: string;
  skillPath: string;  // Path to SKILL.md
}

class SkillLoader {
  async loadOpenClawSkill(skillPath: string): Promise<Tool[]> {
    const skillMd = await fs.readFile(
      path.join(skillPath, 'SKILL.md'), 
      'utf-8'
    );
    
    // Parse SKILL.md format
    // Extract tool definitions, prompts, etc.
    // Convert to Fluxmaster tool format
    
    return this.parseSkillDefinition(skillMd);
  }
  
  private parseSkillDefinition(content: string): Tool[] {
    // OpenClaw skills typically define:
    // - Name and description
    // - Required tools/capabilities
    // - System prompt additions
    // - Example interactions
    
    // Parse and convert...
    return [];
  }
}
```

---

## CLI Interface

```typescript
// src/cli.ts
import { Command } from 'commander';

const program = new Command();

program
  .name('Fluxmaster')
  .description('Multi-agent orchestrator with Copilot auth')
  .version('1.0.0');

program
  .command('start')
  .description('Start the orchestrator')
  .option('-c, --config <path>', 'Config file path', 'fluxmaster.config.json')
  .option('-p, --port <number>', 'API port', '8080')
  .action(async (options) => {
    // Start copilot-api in background
    // Initialize agent manager
    // Start API server
  });

program
  .command('agent')
  .description('Agent commands')
  .argument('<action>', 'Action: spawn, list, kill')
  .option('-m, --model <model>', 'Model to use')
  .option('-i, --id <id>', 'Agent ID')
  .action(async (action, options) => {
    // Handle agent management
  });

program
  .command('chat')
  .description('Interactive chat with an agent')
  .argument('<agent-id>', 'Agent to chat with')
  .action(async (agentId) => {
    // Start interactive REPL
  });

program
  .command('mcp')
  .description('MCP server management')
  .argument('<action>', 'Action: list, add, remove, test')
  .action(async (action) => {
    // Handle MCP server management
  });

program.parse();
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Project setup with TypeScript
- [ ] Copilot authentication integration
- [ ] Basic agent worker with single model support
- [ ] File system tools

### Phase 2: Multi-Agent (Week 3)
- [ ] Agent manager with spawn/kill
- [ ] Session isolation and context
- [ ] Inter-agent messaging
- [ ] CLI interface

### Phase 3: MCP Integration (Week 4)
- [ ] MCP client implementation
- [ ] Stdio and SSE transport support
- [ ] Dynamic tool registration
- [ ] Server lifecycle management

### Phase 4: Browser & Web (Week 5)
- [ ] Playwright integration
- [ ] Browser tools for agents
- [ ] Screenshot and DOM inspection
- [ ] Form automation

### Phase 5: Polish & Compat (Week 6)
- [ ] OpenClaw skill loader
- [ ] Configuration validation
- [ ] Error handling & recovery
- [ ] Documentation

---

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.40.0",
    "openai": "^4.80.0",
    "@modelcontextprotocol/sdk": "^1.25.0",
    "playwright": "^1.50.0",
    "commander": "^12.0.0",
    "zod": "^3.24.0",
    "pino": "^9.6.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0",
    "vitest": "^3.0.0"
  }
}
```

---

## Key Differences from OpenClaw

| Aspect | OpenClaw | Fluxmaster |
|--------|----------|-------|
| Authentication | Anthropic API/OAuth, OpenAI OAuth, OpenRouter | **Dual**: GitHub Copilot Enterprise + Anthropic (API/OAuth) |
| Auth Profiles | `~/.openclaw/agents/<id>/agent/auth-profiles.json` | Compatible format in `~/.fluxmaster/auth-profiles.json` |
| Claude Code Sync | Yes, via keychain + auth.json | Yes, same method (portable code) |
| MCP Support | Via mcporter CLI | Native SDK integration |
| Channels | WhatsApp, Telegram, Slack, etc. | None (API-only, add later) |
| UI | WebChat, Control UI | CLI-first (TUI later) |
| Agent Runtime | Pi agent | Custom lightweight |
| Skill Format | SKILL.md + workspace | Compatible loader |
| Complexity | Full-featured | Minimal core |

### Portability from OpenClaw

The auth module is designed to be compatible with OpenClaw's auth-profiles format, making it possible to:

1. **Share credentials**: If you have OpenClaw configured, Fluxmaster can read from `~/.openclaw/credentials/oauth.json`
2. **Port the auth module**: The `AnthropicAuthProvider` class follows OpenClaw's patterns
3. **Migrate profiles**: Auth profiles can be converted between formats

---

## Next Steps

1. **Start with copilot-api**: Test authentication flow with your enterprise account
2. **Build agent worker**: Single agent with Copilot → model routing
3. **Add MCP client**: Connect to filesystem server as proof of concept
4. **Multi-agent**: Spawn multiple workers, route messages
5. **Browser tools**: Playwright integration
6. **Skill porting**: Test loading an OpenClaw skill

---

## Porting OpenClaw Auth Module

If you want to use OpenClaw's auth module directly instead of the simplified version above, here's the approach:

### OpenClaw Auth Files to Extract

Based on the codebase structure, the relevant files are in `packages/` or `src/`:

```
openclaw/
├── src/
│   ├── auth/
│   │   ├── auth-profiles.ts      # Profile management
│   │   ├── oauth-refresh.ts      # Token refresh logic
│   │   └── providers/
│   │       ├── anthropic.ts      # Anthropic-specific auth
│   │       └── index.ts          # Provider registry
│   └── commands/
│       └── auth-choice-options.ts # CLI auth flow
```

### Key Functions to Port

```typescript
// From OpenClaw's auth system:

// 1. Read Claude Code credentials from keychain (macOS)
function readClaudeCliCredentials(): OAuthCredentials | null;

// 2. Sync external CLI credentials
function syncExternalCliCredentials(provider: string): Promise<boolean>;

// 3. Check if profile is fresh (avoids unnecessary refresh)
function isExternalProfileFresh(profile: AuthProfile): boolean;

// 4. Refresh OAuth token with lock (prevents race conditions)
function refreshOAuthTokenWithLock(profile: AuthProfile): Promise<OAuthCredentials>;

// 5. Resolve API key from profile (with fallback chain)
function resolveApiKeyForProfile(profileId: string): Promise<string>;
```

### OpenClaw Credential Paths

```typescript
// OpenClaw uses these paths:
const OPENCLAW_CONFIG_DIR = '~/.openclaw';
const OPENCLAW_CREDENTIALS = '~/.openclaw/credentials/oauth.json';
const OPENCLAW_AUTH_PROFILES = '~/.openclaw/agents/<agentId>/agent/auth-profiles.json';

// Claude Code uses:
const CLAUDE_CODE_CONFIG = '~/.claude/auth.json';
const CLAUDE_CODE_SETTINGS = '~/.claude/settings.json';

// macOS Keychain entry:
const KEYCHAIN_SERVICE = 'Claude Code-credentials';
```

### Reading from OpenClaw's Existing Config

If you already have OpenClaw configured, you can read its credentials:

```typescript
// src/auth/openclaw-compat.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const OPENCLAW_OAUTH_PATH = path.join(
  os.homedir(), 
  '.openclaw', 
  'credentials', 
  'oauth.json'
);

async function importFromOpenClaw(): Promise<AuthProfile | null> {
  try {
    const data = await fs.readFile(OPENCLAW_OAUTH_PATH, 'utf-8');
    const oauth = JSON.parse(data);
    
    if (oauth.anthropic) {
      return {
        id: 'anthropic:openclaw-import',
        provider: 'anthropic',
        mode: 'oauth',
        credentials: {
          type: 'oauth',
          accessToken: oauth.anthropic.accessToken,
          refreshToken: oauth.anthropic.refreshToken,
          expiresAt: oauth.anthropic.expiresAt,
          scopes: oauth.anthropic.scopes || ['user:inference'],
        },
      };
    }
  } catch (err) {
    // OpenClaw not configured
  }
  
  return null;
}
```

### npm Package Dependencies

If porting from OpenClaw, you'll need these (check their package.json):

```json
{
  "dependencies": {
    // Auth-related
    "keytar": "^7.9.0",        // Cross-platform keychain access
    "open": "^10.0.0",         // Open browser for OAuth
    
    // Or for macOS-only keychain (no native deps):
    // Use child_process to call `security` command
  }
}
```

Would you like me to generate the initial TypeScript project scaffolding with both auth options?
