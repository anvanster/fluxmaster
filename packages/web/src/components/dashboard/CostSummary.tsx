import { formatCost } from '@/lib/utils';

interface CostSummaryProps {
  totalCost: number;
}

export function CostSummary({ totalCost }: CostSummaryProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-2 text-sm font-medium text-gray-300">Estimated Cost</h3>
      <p className="text-2xl font-semibold text-green-400" data-testid="total-cost">
        {formatCost(totalCost)}
      </p>
    </div>
  );
}
