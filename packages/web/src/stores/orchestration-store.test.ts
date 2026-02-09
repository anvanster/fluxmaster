import { describe, it, expect, beforeEach } from 'vitest';
import { useOrchestrationStore } from './orchestration-store.js';

describe('orchestration-store', () => {
  beforeEach(() => {
    useOrchestrationStore.setState({
      activities: [],
      activeDelegations: new Map(),
      activityFeedOpen: false,
    });
  });

  it('adds activity', () => {
    const { addActivity } = useOrchestrationStore.getState();
    addActivity({
      id: '1',
      kind: 'delegation_started',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      timestamp: new Date(),
    });

    expect(useOrchestrationStore.getState().activities).toHaveLength(1);
    expect(useOrchestrationStore.getState().activities[0].kind).toBe('delegation_started');
  });

  it('caps activities at 100', () => {
    const { addActivity } = useOrchestrationStore.getState();
    for (let i = 0; i < 110; i++) {
      addActivity({ id: String(i), kind: 'agent_status', timestamp: new Date() });
    }

    expect(useOrchestrationStore.getState().activities).toHaveLength(100);
    expect(useOrchestrationStore.getState().activities[0].id).toBe('10');
  });

  it('startDelegation adds to active delegations', () => {
    const { startDelegation } = useOrchestrationStore.getState();
    startDelegation({
      requestId: 'del-1',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      message: 'Find info',
      startedAt: new Date(),
    });

    const state = useOrchestrationStore.getState();
    expect(state.activeDelegations.size).toBe(1);
    expect(state.activeDelegations.get('del-1')?.targetAgentId).toBe('researcher');
  });

  it('startDelegation auto-opens activity feed when first delegation starts', () => {
    expect(useOrchestrationStore.getState().activityFeedOpen).toBe(false);

    const { startDelegation } = useOrchestrationStore.getState();
    startDelegation({
      requestId: 'del-1',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      message: 'Find info',
      startedAt: new Date(),
    });

    expect(useOrchestrationStore.getState().activityFeedOpen).toBe(true);
  });

  it('startDelegation does not change feed state when already has delegations', () => {
    const { startDelegation, setActivityFeedOpen } = useOrchestrationStore.getState();
    startDelegation({
      requestId: 'del-1',
      sourceAgentId: 'coordinator',
      targetAgentId: 'a1',
      message: 'msg',
      startedAt: new Date(),
    });

    setActivityFeedOpen(false);

    useOrchestrationStore.getState().startDelegation({
      requestId: 'del-2',
      sourceAgentId: 'coordinator',
      targetAgentId: 'a2',
      message: 'msg',
      startedAt: new Date(),
    });

    expect(useOrchestrationStore.getState().activityFeedOpen).toBe(false);
  });

  it('completeDelegation removes from active delegations', () => {
    const { startDelegation, completeDelegation } = useOrchestrationStore.getState();
    startDelegation({
      requestId: 'del-1',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      message: 'Find info',
      startedAt: new Date(),
    });
    completeDelegation('del-1');

    expect(useOrchestrationStore.getState().activeDelegations.size).toBe(0);
  });

  it('toggleActivityFeed toggles open state', () => {
    const { toggleActivityFeed } = useOrchestrationStore.getState();
    expect(useOrchestrationStore.getState().activityFeedOpen).toBe(false);
    toggleActivityFeed();
    expect(useOrchestrationStore.getState().activityFeedOpen).toBe(true);
    useOrchestrationStore.getState().toggleActivityFeed();
    expect(useOrchestrationStore.getState().activityFeedOpen).toBe(false);
  });

  it('clearActivities resets everything', () => {
    const { addActivity, startDelegation, clearActivities } = useOrchestrationStore.getState();
    addActivity({ id: '1', kind: 'agent_status', timestamp: new Date() });
    startDelegation({
      requestId: 'del-1',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      message: 'msg',
      startedAt: new Date(),
    });
    clearActivities();

    const state = useOrchestrationStore.getState();
    expect(state.activities).toHaveLength(0);
    expect(state.activeDelegations.size).toBe(0);
  });
});
