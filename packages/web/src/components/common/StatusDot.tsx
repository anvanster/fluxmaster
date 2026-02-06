import { cn } from '@/lib/utils';

interface StatusDotProps {
  status: 'idle' | 'processing' | 'error' | 'terminated' | 'connected' | 'disconnected';
  className?: string;
}

const statusStyles = {
  idle: 'bg-green-500',
  processing: 'bg-blue-500 animate-pulse',
  error: 'bg-red-500',
  terminated: 'bg-gray-500',
  connected: 'bg-green-500',
  disconnected: 'bg-red-500',
};

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', statusStyles[status], className)}
      title={status}
    />
  );
}
