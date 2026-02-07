-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_conversations_agent ON conversations(agent_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Events (for replay)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  agent_id TEXT,
  request_id TEXT,
  payload TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_request ON events(request_id);
CREATE INDEX idx_events_agent ON events(agent_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Usage history
CREATE TABLE IF NOT EXISTS usage (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  request_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_usage_agent ON usage(agent_id);

-- Request timing (for debug panel)
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'streaming', 'completed', 'error')),
  started_at TEXT NOT NULL,
  first_token_at TEXT,
  completed_at TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  iterations INTEGER,
  tool_calls TEXT,
  error_message TEXT
);

CREATE INDEX idx_requests_agent ON requests(agent_id);
CREATE INDEX idx_requests_conversation ON requests(conversation_id);
CREATE INDEX idx_requests_started ON requests(started_at);
