import type { BudgetAlertResponse } from '@fluxmaster/api-types';

function formatBudgetAmount(amount: number, unit?: string): string {
  if (unit === 'premium_requests') return `${amount.toFixed(1)} reqs`;
  return `$${amount.toFixed(2)}`;
}

interface BudgetAlertsProps {
  alerts: BudgetAlertResponse[];
}

export function BudgetAlerts({ alerts }: BudgetAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-300">Budget Alerts</h3>
        <p className="text-sm text-gray-500">No budget alerts</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-300">Budget Alerts</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between rounded border px-3 py-2 text-xs ${
              alert.type === 'exceeded'
                ? 'border-red-800 bg-red-900/20 text-red-300'
                : 'border-yellow-800 bg-yellow-900/20 text-yellow-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{alert.type}</span>
              <span className="text-gray-400">{alert.budgetId}</span>
            </div>
            <div className="text-gray-400">
              {formatBudgetAmount(alert.currentCost, alert.unit)} / {formatBudgetAmount(alert.maxCost, alert.unit)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
