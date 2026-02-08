import { useAgents } from '@/api/hooks/useAgents';
import { useHealth, useUsage } from '@/api/hooks/useSystem';
import { useCost } from '@/api/hooks/useCost';
import { useBudgets, useBudgetAlerts } from '@/api/hooks/useBudgets';
import { AgentStatusGrid } from './AgentStatusGrid';
import { UsageSummary } from './UsageSummary';
import { UsageChart } from './UsageChart';
import { SystemHealth } from './SystemHealth';
import { CostSummary } from './CostSummary';
import { CostByAgent } from './CostByAgent';
import { BudgetProgress } from './BudgetProgress';
import { BudgetAlerts } from './BudgetAlerts';
import { Spinner } from '@/components/common/Spinner';

export function DashboardView() {
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: health } = useHealth();
  const { data: usage } = useUsage();
  const { data: cost } = useCost();
  const { data: budgets } = useBudgets();
  const { data: budgetAlerts } = useBudgetAlerts({ limit: 10 });

  if (agentsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" data-testid="dashboard-view">
      {health && <SystemHealth status={health.status} uptime={health.uptime} />}

      {usage && (
        <UsageSummary
          inputTokens={usage.total.inputTokens}
          outputTokens={usage.total.outputTokens}
          requestCount={usage.total.requestCount}
        />
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-300">Agents</h3>
        <AgentStatusGrid agents={agents} />
      </div>

      {cost && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CostSummary totalCost={cost.totalCost} totalPremiumRequests={cost.totalPremiumRequests} />
          <CostByAgent byAgent={cost.byAgent} />
        </div>
      )}

      {budgets && budgets.budgets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <BudgetProgress budgets={budgets.budgets} />
          {budgetAlerts && <BudgetAlerts alerts={budgetAlerts.alerts} />}
        </div>
      )}

      {usage && Object.keys(usage.byAgent).length > 0 && <UsageChart byAgent={usage.byAgent} />}
    </div>
  );
}
