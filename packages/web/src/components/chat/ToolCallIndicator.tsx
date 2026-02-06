import { cn } from '@/lib/utils';
import { Spinner } from '@/components/common/Spinner';
import { Wrench, Check, X } from 'lucide-react';

interface ToolCallIndicatorProps {
  name: string;
  status: 'pending' | 'done' | 'error';
}

export function ToolCallIndicator({ name, status }: ToolCallIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded border px-2 py-1 text-xs',
        status === 'pending' && 'border-blue-800 bg-blue-950 text-blue-300',
        status === 'done' && 'border-green-800 bg-green-950 text-green-300',
        status === 'error' && 'border-red-800 bg-red-950 text-red-300',
      )}
      data-testid="tool-call-indicator"
    >
      {status === 'pending' ? <Spinner size="sm" /> : status === 'done' ? <Check size={12} /> : <X size={12} />}
      <Wrench size={12} />
      <span>{name}</span>
    </div>
  );
}
