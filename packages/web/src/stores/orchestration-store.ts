import { create } from 'zustand';

export interface OrchestrationActivity {
  id: string;
  kind: 'delegation_started' | 'delegation_completed' | 'fanout_started' | 'fanout_completed' | 'scratchpad_updated' | 'task_created' | 'task_status_changed' | 'agent_status';
  sourceAgentId?: string;
  targetAgentId?: string;
  targetAgentIds?: string[];
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface ActiveDelegation {
  requestId: string;
  sourceAgentId: string;
  targetAgentId: string;
  message: string;
  startedAt: Date;
}

const MAX_ACTIVITIES = 100;

interface OrchestrationState {
  activities: OrchestrationActivity[];
  activeDelegations: Map<string, ActiveDelegation>;
  activityFeedOpen: boolean;

  addActivity: (activity: OrchestrationActivity) => void;
  startDelegation: (delegation: ActiveDelegation) => void;
  completeDelegation: (requestId: string) => void;
  toggleActivityFeed: () => void;
  setActivityFeedOpen: (open: boolean) => void;
  clearActivities: () => void;
}

export const useOrchestrationStore = create<OrchestrationState>((set) => ({
  activities: [],
  activeDelegations: new Map(),
  activityFeedOpen: false,

  addActivity: (activity) =>
    set((state) => ({
      activities: [...state.activities, activity].slice(-MAX_ACTIVITIES),
    })),

  startDelegation: (delegation) =>
    set((state) => {
      const delegations = new Map(state.activeDelegations);
      delegations.set(delegation.requestId, delegation);
      return {
        activeDelegations: delegations,
        activityFeedOpen: state.activeDelegations.size === 0 ? true : state.activityFeedOpen,
      };
    }),

  completeDelegation: (requestId) =>
    set((state) => {
      const delegations = new Map(state.activeDelegations);
      delegations.delete(requestId);
      return { activeDelegations: delegations };
    }),

  toggleActivityFeed: () =>
    set((state) => ({ activityFeedOpen: !state.activityFeedOpen })),

  setActivityFeedOpen: (open) =>
    set({ activityFeedOpen: open }),

  clearActivities: () =>
    set({ activities: [], activeDelegations: new Map() }),
}));
