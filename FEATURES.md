# Fluxmaster — Feature Inventory

## Current Features (Implemented)

### Backend — Server Package (`packages/server`)
- Fastify 5 REST API with route plugins
- WebSocket streaming with `requestId` correlation
- Auto-spawn agents from `fluxmaster.config.json` on startup
- REST endpoints: agents CRUD, tools, MCP servers, auth status, config, plugins, system health, usage
- CORS + static file serving for production SPA
- Error handler mapping `FluxmasterError` subclasses to HTTP status codes
- Zod request body validation middleware
- Connection manager with heartbeat for WebSocket
- Tool result forwarding via WebSocket (`tool_result` events with content and error status)

### Backend — Core Packages
- Multi-agent orchestrator with agentic loop (tool use → re-prompt)
- Copilot enterprise auth proxy + direct API key auth
- Claude CLI token detection
- MCP server manager (stdio/SSE transports, auto tool registration)
- Browser automation via Playwright (navigate, click, type, screenshot, evaluate)
- Plugin system with lifecycle hooks
- Streaming support with retry logic
- 205 unit tests, 11 backend E2E tests

### Frontend — Web Package (`packages/web`)

#### Layout & Navigation
- Sidebar with nav links: Chat, Dashboard, Admin
- Connection status indicator (Connected/Disconnected)
- Header with page title
- React Router with 3 routes: `/` (Chat), `/dashboard`, `/admin`

#### Chat Page
- Real-time streaming chat via WebSocket
- Markdown rendering for assistant messages (react-markdown + remark-gfm)
- Syntax-highlighted code blocks with language labels (react-syntax-highlighter + oneDark theme)
- Inline code, bold, italic, lists, links, blockquotes, tables
- User messages rendered as plain text (no markdown)
- Agent selector dropdown (switch between agents)
- Auto-scrolling message list
- User/assistant message bubbles with timestamps
- Streaming text display with live updates
- Expandable tool call indicators — click to reveal tool result content
- Tool call status: pending spinner, done checkmark, error X
- Error styling for failed tool calls with result details
- Enter to send, Shift+Enter for newline
- Send button with disabled state during streaming
- Clear conversation button per agent
- Conversation persistence via localStorage (survives page reload)
- Empty state when no messages

#### Dashboard Page
- Agent status cards (id, model, status dot)
- Responsive agent grid
- System health display (status + uptime)
- Usage summary (total input/output tokens, request count)
- Per-agent usage bar chart

#### Admin Page (5 tabs)
- **Config**: JSON config display, Edit/Cancel/Save toggle, textarea editor
- **Agents**: Live agent list with id, model, status dot, count badge, and kill button per agent; Spawn agent form (id + model inputs, spawn button with validation)
- **MCP**: Server list with start/stop buttons, or empty state
- **Plugins**: Plugin list or empty state
- **Auth**: Copilot configured/ready, Claude CLI, direct providers status

#### Infrastructure
- Vite 6 + React 19 + Tailwind CSS 4
- TanStack React Query 5 for data fetching
- Zustand 5 for chat state management with localStorage persistence
- WebSocket client with auto-reconnect and exponential backoff
- API fetch wrapper with error handling
- Path alias (`@/` and `@fluxmaster/api-types`)
- Dev proxy: `/api` → API server, `/ws` → WebSocket
- 363 unit tests, 34 Playwright E2E tests
- Dev startup script (`scripts/dev.sh`) with port conflict handling

---

## Roadmap

### Phase 1: Foundation

**Event Bus** — Core architectural piece that unlocks real-time features and decouples the system.
- `FluxmasterEvent` discriminated union covering agent lifecycle, messages, tools, MCP, cost
- `EventBus` with typed `emit()`, `on()`, `once()` in `packages/core`
- Replace ad-hoc WS event forwarding in handler with event bus subscriptions
- Enable plugins to subscribe to system events
- Forward events to WebSocket for real-time dashboard updates

**Keyboard Shortcuts + Command Palette**
- `Cmd/Ctrl+K` command palette for quick actions (switch agent, new conversation, navigate)
- `Cmd+1/2/3` for page navigation
- `Cmd+/` to focus chat input
- `Escape` to cancel streaming
- `?` to show shortcuts modal
- Shortcut hints next to buttons

**Export/Import**
- Export conversations as JSON or Markdown
- JSON format with frontmatter (agent, model, date, token counts)
- Markdown format with code blocks preserved
- Import conversations from JSON
- Export button in chat view, bulk export in admin

**Basic Cost Tracking**
- Model pricing table in config (input/output per 1M tokens)
- Calculate cost from existing usage records
- Cost column in usage dashboard
- Per-agent and total cost display
- Daily/weekly/monthly cost summary

### Phase 2: Developer Experience

**Replay/Debug Panel**
- Debug sidebar showing raw request/response for each message
- Token breakdown (system prompt, messages, tools, output)
- Timing info (request start, first token, total duration)
- Tool call details (input, output, duration)
- Fork conversation at any message — edit and re-run from that point
- Side-by-side model comparison (same input, different models)

**SQLite Storage**
- Optional SQLite backend for server-side persistence (`~/.fluxmaster/data.db`)
- Conversations, usage records, audit events
- Migration system for schema changes
- Replace localStorage as primary store (localStorage becomes offline fallback)
- Query API for usage analytics and conversation search

**AI-Assisted Features** (using a cheap model like Haiku)
- Auto-title conversations from first few messages
- Suggested follow-up questions after assistant response
- One-click conversation summary
- Natural language to agent config ("create a code review agent")
- Error explanation in plain language

### Phase 3: Enterprise Features

**Cost Management with Budgets**
- Budget limits: global, per-agent, per-user (hourly/daily/weekly/monthly)
- Alert thresholds (50%, 80%, 95%) with in-app notifications
- Policies on budget exceeded: block, downgrade model, alert-only, require approval
- Fallback to cheaper model when over budget
- Cost projection based on current burn rate

**Workflow Orchestration** (backend engine, simple UI)
- YAML/JSON workflow definitions with step sequencing
- Conditional branching (on success/failure)
- Parallel step execution
- Input mapping between steps (JSONPath expressions)
- Triggers: manual, webhook, schedule (cron)
- Execution list view with step status and timing
- Visual workflow builder deferred to Phase 5

**Tool Security**
- Per-tool permissions (allowed agents, rate limits)
- Timeout + process limits on tool execution
- Content filtering rules (input/output)
- PII detection and masking
- Audit log for tool calls

### Phase 4: Scale & Teams

**Multi-User & Auth**
- User authentication (OAuth / API key)
- Per-user agent sessions
- Role-based access control (viewer, operator, admin)
- Audit log of all actions

**Observability & Tracing**
- Structured traces with spans (LLM calls, tool calls, MCP calls)
- Waterfall timeline visualization
- P50/P95/P99 latency tracking
- Export to Jaeger/Zipkin/OTLP

**Collaboration Basics**
- Workspaces for team isolation
- Share conversations and workflows
- Comment threads on messages
- Activity feed

### Phase 5: Ecosystem

**Visual Workflow Builder** — Drag-drop canvas for workflow definitions
**Plugin Marketplace** — Registry, discovery, one-click install, publishing
**Advanced Collaboration** — Approval queues, presence indicators, annotations
**Public API & SDK** — REST API docs (OpenAPI), client SDK for integrations

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| **Agent memory via memrl MCP** | memrl provides episodic memory with retrieval, capture, feedback, and utility propagation. Supports cross-project search. Plugs in via existing MCP infrastructure with zero implementation work. Custom memory system deferred indefinitely. |
| **Event bus before features** | Real-time dashboard, webhook integrations, workflow triggers, plugin hooks, and cost tracking all depend on a clean event system. Building features without it means coupling and rework. |
| **SQLite before Postgres** | Single-file database, zero configuration, sufficient for single-user/small-team. Postgres adds operational complexity that's only justified at scale. |
| **Workflow engine before visual builder** | YAML/JSON definitions + list UI delivers 80% of the value at 20% of the cost. Visual canvas is a separate product-level effort. |
| **No custom tool sandbox runtime** | Timeout + process limits on existing tool execution is sufficient. Docker/Firecracker sandboxing is overkill for local tools. Revisit only for untrusted MCP servers. |
| **Plugin marketplace deferred to Phase 5** | Building a registry server, package manager, and verification system is a separate product. Local plugins are sufficient until there's a community. |

---

## Chat Enhancements (Mid-Term, independent of phases)

These can be implemented incrementally alongside any phase:

- Conversation history sidebar (multiple threads per agent)
- Message search/filter
- Copy message content button
- Regenerate last response button
- Token usage display per message
- File/image upload in chat
- System prompt editor per agent
- Toast notifications for actions (agent spawned, config saved, errors)
- Dark/light theme toggle
- Responsive mobile layout
- Loading skeletons instead of spinners
- MCP server logs viewer in admin
- Tool registry browser with descriptions and schemas
- Config validation with error highlighting
- Agent template presets
