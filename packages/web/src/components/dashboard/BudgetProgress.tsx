import type { BudgetStatusResponse } from '@fluxmaster/api-types';

function formatBudgetAmount(amount: number, unit?: string): string {
  if (unit === 'premium_requests') return `${amount.toFixed(1)} reqs`;
  return `$${amount.toFixed(2)}`;
}

interface BudgetProgressProps {
  budgets: BudgetStatusResponse[];
}

export function BudgetProgress({ budgets }: BudgetProgressProps) {
  if (budgets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-300">Budgets</h3>
        <p className="text-sm text-gray-500">No budgets configured</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-300">Budgets</h3>
      <div className="space-y-3">
        {budgets.map((b) => (
          <div key={b.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-200">{b.id}</span>
                <span className="text-gray-500">{b.period}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">
                  {formatBudgetAmount(b.currentCost, b.unit)} / {formatBudgetAmount(b.maxCost, b.unit)}
                </span>
                {b.exceeded && (
                  <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs font-medium text-red-400">
                    Exceeded
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className={`h-full rounded-full transition-all ${
                  b.exceeded
                    ? 'bg-red-500'
                    : b.percentage >= 0.8
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(b.percentage * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
