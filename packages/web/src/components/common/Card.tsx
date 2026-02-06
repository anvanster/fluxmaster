import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-gray-800 bg-gray-900 p-4', className)} {...props}>
      {children}
    </div>
  );
}
