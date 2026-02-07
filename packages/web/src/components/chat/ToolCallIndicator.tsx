import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/common/Spinner';
import { Wrench, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

interface ToolCallIndicatorProps {
  name: string;
  status: 'pending' | 'done' | 'error';
  result?: string;
  isError?: boolean;
}

export function ToolCallIndicator({ name, status, result, isError }: ToolCallIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = result !== undefined;

  return (
    <div data-testid="tool-call-indicator">
      <button
        onClick={() => hasResult && setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-2 rounded border px-2 py-1 text-xs',
          status === 'pending' && 'border-blue-800 bg-blue-950 text-blue-300',
          status === 'done' && 'border-green-800 bg-green-950 text-green-300',
          status === 'error' && 'border-red-800 bg-red-950 text-red-300',
          hasResult && 'cursor-pointer hover:brightness-110',
        )}
        disabled={!hasResult}
        type="button"
      >
        {status === 'pending' ? <Spinner size="sm" /> : status === 'done' ? <Check size={12} /> : <X size={12} />}
        <Wrench size={12} />
        <span className="flex-1 text-left">{name}</span>
        {hasResult && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
      </button>
      {expanded && result && (
        <div
          className={cn(
            'mt-1 max-h-48 overflow-auto rounded border px-2 py-1 font-mono text-xs',
            isError ? 'border-red-800 bg-red-950/50 text-red-300' : 'border-gray-700 bg-gray-900 text-gray-300',
          )}
          data-testid="tool-call-result"
        >
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
