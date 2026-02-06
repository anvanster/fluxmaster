import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <div className={cn('hidden lg:block', sidebarOpen && 'block')}>
        <Sidebar connectionStatus="disconnected" />
      </div>
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
