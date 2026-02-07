-- Suggested follow-ups per request
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  suggestions TEXT NOT NULL, -- JSON array of strings
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_suggestions_request ON suggestions(request_id);
CREATE INDEX idx_suggestions_conversation ON suggestions(conversation_id);

-- Conversation summaries
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
