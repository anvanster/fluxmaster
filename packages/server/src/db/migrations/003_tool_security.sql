-- Tool audit log
CREATE TABLE IF NOT EXISTS tool_audit_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  args TEXT NOT NULL,
  result TEXT NOT NULL,
  is_error INTEGER NOT NULL DEFAULT 0,
  permitted INTEGER NOT NULL DEFAULT 1,
  denial_reason TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tool_audit_agent ON tool_audit_log(agent_id);
CREATE INDEX idx_tool_audit_tool ON tool_audit_log(tool_name);
CREATE INDEX idx_tool_audit_permitted ON tool_audit_log(permitted);
CREATE INDEX idx_tool_audit_timestamp ON tool_audit_log(timestamp);
