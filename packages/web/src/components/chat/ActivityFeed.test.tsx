import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityFeed } from './ActivityFeed';
import { useOrchestrationStore } from '@/stores/orchestration-store';

describe('ActivityFeed', () => {
  beforeEach(() => {
    useOrchestrationStore.setState({
      activities: [],
      activeDelegations: new Map(),
      activityFeedOpen: false,
    });
  });

  it('renders nothing when no activity', () => {
    const { container } = render(<ActivityFeed />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when activities exist', () => {
    useOrchestrationStore.getState().addActivity({
      id: '1',
      kind: 'delegation_completed',
      targetAgentId: 'researcher',
      data: { success: true, durationMs: 1200 },
      timestamp: new Date(),
    });

    render(<ActivityFeed />);
    expect(screen.getByTestId('activity-feed')).toBeDefined();
    expect(screen.getByText('Orchestration Activity')).toBeDefined();
  });

  it('shows active count badge', () => {
    useOrchestrationStore.getState().startDelegation({
      requestId: 'del-1',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      message: 'Find info',
      startedAt: new Date(),
    });
    useOrchestrationStore.getState().addActivity({
      id: '1',
      kind: 'delegation_started',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      timestamp: new Date(),
    });

    render(<ActivityFeed />);
    expect(screen.getByTestId('active-count-badge')).toBeDefined();
    expect(screen.getByText('1 active')).toBeDefined();
  });

  it('shows active delegations when feed is open', () => {
    useOrchestrationStore.getState().startDelegation({
      requestId: 'del-1',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      message: 'Search for TODO comments',
      startedAt: new Date(),
    });
    useOrchestrationStore.getState().addActivity({
      id: '1',
      kind: 'delegation_started',
      sourceAgentId: 'coordinator',
      targetAgentId: 'researcher',
      timestamp: new Date(),
    });

    render(<ActivityFeed />);
    // Feed auto-opens on first delegation
    expect(screen.getByTestId('active-delegation')).toBeDefined();
    expect(screen.getByText(/coordinator/)).toBeDefined();
    expect(screen.getByText(/researcher/)).toBeDefined();
  });

  it('shows completed activities when feed is open', () => {
    useOrchestrationStore.setState({ activityFeedOpen: true });
    useOrchestrationStore.getState().addActivity({
      id: '1',
      kind: 'delegation_completed',
      targetAgentId: 'researcher',
      data: { success: true, durationMs: 1500 },
      timestamp: new Date(),
    });

    render(<ActivityFeed />);
    expect(screen.getByTestId('completed-activity')).toBeDefined();
  });

  it('toggles feed open/close on click', async () => {
    const user = userEvent.setup();
    useOrchestrationStore.getState().addActivity({
      id: '1',
      kind: 'delegation_completed',
      targetAgentId: 'researcher',
      data: { success: true, durationMs: 500 },
      timestamp: new Date(),
    });

    render(<ActivityFeed />);

    // Initially closed (no completed activities visible)
    expect(screen.queryByTestId('completed-activity')).toBeNull();

    // Click to open
    await user.click(screen.getByTestId('activity-feed-toggle'));
    expect(screen.getByTestId('completed-activity')).toBeDefined();

    // Click to close
    await user.click(screen.getByTestId('activity-feed-toggle'));
    expect(screen.queryByTestId('completed-activity')).toBeNull();
  });
});
