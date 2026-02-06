import { Card } from '@/components/common/Card';
import { formatTokens } from '@/lib/utils';

interface UsageSummaryProps {
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

export function UsageSummary({ inputTokens, outputTokens, requestCount }: UsageSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="usage-summary">
      <Card>
        <div className="text-xs text-gray-500">Input Tokens</div>
        <div className="text-xl font-bold text-white">{formatTokens(inputTokens)}</div>
      </Card>
      <Card>
        <div className="text-xs text-gray-500">Output Tokens</div>
        <div className="text-xl font-bold text-white">{formatTokens(outputTokens)}</div>
      </Card>
      <Card>
        <div className="text-xs text-gray-500">Requests</div>
        <div className="text-xl font-bold text-white">{requestCount}</div>
      </Card>
    </div>
  );
}
