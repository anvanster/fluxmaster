export interface AgentDecision {
  id: string;
  agentId: string;
  decision: string;
  reasoning: string;
  outcome?: string;
  confidence: number;
  context?: string;
  createdAt: Date;
}

export interface AgentLearning {
  id: string;
  agentId: string;
  type: 'success' | 'failure' | 'pattern' | 'preference';
  content: string;
  source: string;
  confidence: number;
  createdAt: Date;
}

export interface AgentGoalRecord {
  id: string;
  agentId: string;
  goal: string;
  steps: string[];
  status: 'active' | 'completed' | 'blocked' | 'failed';
  reflection?: string;
  iterations: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface IAgentMemoryStore {
  saveDecision(decision: Omit<AgentDecision, 'id' | 'createdAt'>): AgentDecision;
  saveLearning(learning: Omit<AgentLearning, 'id' | 'createdAt'>): AgentLearning;
  recall(agentId: string, query: string, limit?: number): Array<AgentDecision | AgentLearning>;
  getDecisions(agentId: string, limit?: number): AgentDecision[];
  getLearnings(agentId: string, limit?: number): AgentLearning[];
  saveGoal(goal: Omit<AgentGoalRecord, 'id' | 'createdAt'>): AgentGoalRecord;
  updateGoal(id: string, updates: Partial<Pick<AgentGoalRecord, 'status' | 'reflection' | 'iterations' | 'completedAt'>>): void;
  getActiveGoal(agentId: string): AgentGoalRecord | undefined;
  getGoalHistory(agentId: string, limit?: number): AgentGoalRecord[];
}
