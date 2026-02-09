import { useEffect, useState } from 'react';
import { useOrchestrationStore } from '@/stores/orchestration-store';
import type { OrchestrationActivity, ActiveDelegation } from '@/stores/orchestration-store';
import { ArrowRight, GitBranch, StickyNote, ListChecks, Bot, Activity } from 'lucide-react';

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function ActivityIcon({ kind }: { kind: OrchestrationActivity['kind'] }) {
  switch (kind) {
    case 'delegation_started':
    case 'delegation_completed':
      return <ArrowRight size={12} />;
    case 'fanout_started':
    case 'fanout_completed':
      return <GitBranch size={12} />;
    case 'scratchpad_updated':
      return <StickyNote size={12} />;
    case 'task_created':
    case 'task_status_changed':
      return <ListChecks size={12} />;
    case 'agent_status':
      return <Bot size={12} />;
  }
}

function ActiveDelegationRow({ delegation }: { delegation: ActiveDelegation }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - delegation.startedAt.getTime());
    }, 100);
    return () => clearInterval(interval);
  }, [delegation.startedAt]);

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs" data-testid="active-delegation">
      <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      <span className="font-medium text-zinc-300">
        {delegation.sourceAgentId} <ArrowRight size={10} className="inline" /> {delegation.targetAgentId}
      </span>
      <span className="text-zinc-500 truncate max-w-48">
        &quot;{delegation.message.slice(0, 60)}{delegation.message.length > 60 ? '...' : ''}&quot;
      </span>
      <span className="ml-auto text-zinc-500 tabular-nums">{formatElapsed(elapsed)}</span>
    </div>
  );
}

function CompletedActivityRow({ activity }: { activity: OrchestrationActivity }) {
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 text-xs text-zinc-400" data-testid="completed-activity">
      <span className="text-zinc-500 tabular-nums">{formatTime(activity.timestamp)}</span>
      <ActivityIcon kind={activity.kind} />
      <span className="truncate">
        {activityLabel(activity)}
      </span>
    </div>
  );
}

function activityLabel(activity: OrchestrationActivity): string {
  switch (activity.kind) {
    case 'delegation_completed': {
      const dur = activity.data?.durationMs as number | undefined;
      const success = activity.data?.success as boolean | undefined;
      return `${success ? '\u2713' : '\u2717'} ${activity.targetAgentId} done${dur ? ` (${formatElapsed(dur)})` : ''}`;
    }
    case 'fanout_started':
      return `fan-out to ${activity.targetAgentIds?.join(', ')}`;
    case 'fanout_completed': {
      const dur = activity.data?.durationMs as number | undefined;
      return `fan-out done${dur ? ` (${formatElapsed(dur)})` : ''}`;
    }
    case 'scratchpad_updated':
      return `scratchpad: "${activity.data?.key}"`;
    case 'task_created':
      return `task created: "${activity.data?.title}"`;
    case 'task_status_changed':
      return `task ${activity.data?.taskId}: ${activity.data?.status}`;
    case 'agent_status':
      return `${activity.targetAgentId}: ${activity.data?.event}`;
    case 'delegation_started':
      return `${activity.sourceAgentId} \u2192 ${activity.targetAgentId}`;
    default:
      return activity.kind;
  }
}

const MAX_COMPLETED_SHOWN = 20;

export function ActivityFeed() {
  const { activities, activeDelegations, activityFeedOpen, toggleActivityFeed } = useOrchestrationStore();

  const activeDelegationList = Array.from(activeDelegations.values());
  const completedActivities = activities
    .filter((a) => a.kind !== 'delegation_started')
    .slice(-MAX_COMPLETED_SHOWN);

  const hasAnyActivity = activities.length > 0 || activeDelegationList.length > 0;
  if (!hasAnyActivity) return null;

  return (
    <div className="border-t border-zinc-700 bg-zinc-900" data-testid="activity-feed">
      <button
        onClick={toggleActivityFeed}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        data-testid="activity-feed-toggle"
      >
        <span className="flex items-center gap-1.5">
          <Activity size={12} />
          Orchestration Activity
        </span>
        {activeDelegationList.length > 0 && (
          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white" data-testid="active-count-badge">
            {activeDelegationList.length} active
          </span>
        )}
      </button>
      {activityFeedOpen && (
        <div className="max-h-48 overflow-y-auto border-t border-zinc-800">
          {activeDelegationList.length > 0 && (
            <div className="border-b border-zinc-800 py-1">
              {activeDelegationList.map((d) => (
                <ActiveDelegationRow key={d.requestId} delegation={d} />
              ))}
            </div>
          )}
          {completedActivities.length > 0 && (
            <div className="py-1">
              {completedActivities.map((a) => (
                <CompletedActivityRow key={a.id} activity={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
