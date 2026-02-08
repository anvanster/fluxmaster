-- Budget alerts
CREATE TABLE IF NOT EXISTS budget_alerts (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('warning', 'exceeded')),
  threshold REAL NOT NULL,
  current_cost REAL NOT NULL,
  max_cost REAL NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_budget_alerts_budget ON budget_alerts(budget_id);
CREATE INDEX idx_budget_alerts_timestamp ON budget_alerts(timestamp);
