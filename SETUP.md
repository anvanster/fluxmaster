# Fluxmaster Setup Guide

## Prerequisites

- Node.js 22+
- npm 10+
- GitHub Copilot subscription (individual, business, or enterprise)
- Optionally: Claude CLI (`claude`) for Anthropic model access

## Installation

```bash
git clone <repo-url>
cd orchestrator
npm install
npm run build
```

## Authentication

Fluxmaster auto-detects tokens from your existing CLI logins. No API keys needed if you have GitHub Copilot or Claude CLI set up.

### Option 1: GitHub Copilot (recommended)

Gives access to Claude, GPT, Gemini, and Grok models through your Copilot subscription.

**First-time setup:**

```bash
# 1. Initialize config
npm run fluxmaster -- init

# 2. Start the copilot proxy (will prompt for device auth on first run)
npx copilot-api@latest start --port 4141
```

On first run, `copilot-api` will show a device code like `1EA3-7D36`. Go to https://github.com/login/device and enter the code to authorize.

After authorization, the proxy caches your token for future runs.

**Available models via Copilot:**

- `claude-sonnet-4`, `claude-sonnet-4.5`, `claude-opus-4.5`, `claude-opus-4.6`, `claude-haiku-4.5`
- `gpt-5`, `gpt-5.1`, `gpt-5.2`, `gpt-4o`, `gpt-4.1`
- `gemini-2.5-pro`, `gemini-3-pro-preview`, `gemini-3-flash-preview`
- And more (run the proxy to see the full list)

### Option 2: Claude CLI

If you have Claude Code installed and logged in, Fluxmaster will detect it automatically.

```bash
# Check if claude is installed and authenticated
claude --version
```

Note: On macOS, Claude Code stores auth in the system keychain. Fluxmaster detects that the CLI is available and can delegate API calls through it as a subprocess.

### Option 3: Direct API Keys (fallback)

Set environment variables for direct API access:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export GOOGLE_API_KEY=...
```

### Check Your Auth Status

```bash
npm run fluxmaster -- auth status
npx copilot-api@latest start --port 4141 --account-type individual --proxy-env

```

Example output:
```
Authentication Status:
  Copilot proxy: configured (starts on demand)
  Claude CLI:    detected
  Direct API keys: none configured
```

### Login Guidance

```bash
# Check GitHub CLI auth
npm run fluxmaster -- auth login github

# Check Claude CLI auth
npm run fluxmaster -- auth login claude
```

## Configuration

Config file: `fluxmaster.config.json` (created by `fluxmaster init`)

```json
{
  "auth": {
    "copilot": {
      "accountType": "individual",
      "port": 4141,
      "maxStartAttempts": 30
    },
    "preferDirectApi": false
  },
  "agents": {
    "defaults": {
      "maxTokens": 8192,
      "temperature": 0.7
    },
    "list": [
      {
        "id": "default",
        "model": "claude-sonnet-4",
        "systemPrompt": "You are a helpful assistant.",
        "tools": ["read_file", "write_file", "list_files", "bash_execute"]
      }
    ]
  }
}
```

### Config Fields

| Field | Default | Description |
|-------|---------|-------------|
| `auth.copilot.accountType` | `individual` | GitHub Copilot plan: `individual`, `business`, or `enterprise` |
| `auth.copilot.port` | `4141` | Port for the copilot-api proxy |
| `auth.copilot.maxStartAttempts` | `30` | Seconds to wait for proxy startup |
| `auth.copilot.githubToken` | (auto-detect) | Override with explicit token |
| `auth.copilot.rateLimit` | (none) | Rate limit in seconds between requests |
| `auth.preferDirectApi` | `false` | When `true`, prefer direct API keys over Copilot |

### Auth Routing Priority

When resolving which provider to use for a model:

1. **Direct API** (if `preferDirectApi: true` and key available)
2. **Copilot proxy** (if running and model available)
3. **Claude CLI** (for Anthropic models, if CLI detected)
4. **Direct API** (fallback, if key available)
5. Error if no provider can serve the model

## Running

```bash
# Interactive REPL
npm run fluxmaster -- run

# Development mode (from source, no build needed)
npm run dev -- run

# Run tests
npm test
```

## Project Structure

```
packages/
  core/     - Types, config, logger, errors, utilities
  auth/     - Authentication providers and token detection
  tools/    - Built-in tools (filesystem, bash)
  agents/   - Agent workers, session management, adapters
  cli/      - CLI commands (init, auth, run)
```

## Troubleshooting

### "Failed to get models" when starting copilot-api

Your `accountType` in the config doesn't match your GitHub Copilot plan. Try changing to `individual`:

```json
{ "auth": { "copilot": { "accountType": "individual" } } }
```

### Copilot proxy times out on `auth status`

This is fixed — `auth status` uses lightweight detection without starting the proxy. If you see this on an older build, run `npm run build` to update.

### Claude CLI shows "not available"

Claude Code stores OAuth in the macOS system keychain. Fluxmaster checks for the CLI via `claude --version`. If it's installed but not detected, ensure `claude` is on your PATH.

### JSON log noise in terminal

Logs are suppressed in CLI mode. If you see JSON output, rebuild: `npm run build`.
