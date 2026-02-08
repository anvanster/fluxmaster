import { formatCost } from '@/lib/utils';

interface CostSummaryProps {
  totalCost: number;
  totalPremiumRequests: number;
}

export function CostSummary({ totalCost, totalPremiumRequests }: CostSummaryProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-2 text-sm font-medium text-gray-300">Usage Cost</h3>
      {totalPremiumRequests > 0 && (
        <p className="text-2xl font-semibold text-green-400" data-testid="total-premium-requests">
          {totalPremiumRequests.toFixed(1)} reqs
        </p>
      )}
      {totalCost >= 0.01 && (
        <p className="text-2xl font-semibold text-green-400" data-testid="total-cost">
          {formatCost(totalCost)}
        </p>
      )}
      {totalPremiumRequests === 0 && totalCost < 0.01 && (
        <p className="text-2xl font-semibold text-green-400" data-testid="total-cost">
          {formatCost(0)}
        </p>
      )}
    </div>
  );
}
