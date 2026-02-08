import { formatAmount } from '@/lib/utils';

interface AgentCostEntry {
  amount: number;
  unit: string;
}

interface CostByAgentProps {
  byAgent: Record<string, AgentCostEntry>;
}

export function CostByAgent({ byAgent }: CostByAgentProps) {
  const entries = Object.entries(byAgent);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-300">Usage by Agent</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400">
            <th className="pb-2 font-medium">Agent</th>
            <th className="pb-2 text-right font-medium">Usage</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([agentId, entry]) => (
            <tr key={agentId} className="border-t border-gray-700/50">
              <td className="py-1.5 text-gray-200">{agentId}</td>
              <td className="py-1.5 text-right text-green-400">{formatAmount(entry.amount, entry.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
