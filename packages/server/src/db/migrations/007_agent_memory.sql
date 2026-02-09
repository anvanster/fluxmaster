CREATE TABLE IF NOT EXISTS agent_decisions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  outcome TEXT,
  confidence REAL NOT NULL DEFAULT 0.7,
  context TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_agent_decisions_agent ON agent_decisions(agent_id);

CREATE TABLE IF NOT EXISTS agent_learnings (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('success', 'failure', 'pattern', 'preference')),
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.7,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_agent_learnings_agent ON agent_learnings(agent_id);

CREATE TABLE IF NOT EXISTS agent_goals (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'blocked', 'failed')),
  reflection TEXT,
  iterations INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX idx_agent_goals_agent ON agent_goals(agent_id);
CREATE INDEX idx_agent_goals_status ON agent_goals(agent_id, status);
