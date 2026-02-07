import { NavLink } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { StatusDot } from '@/components/common/StatusDot';

interface SidebarProps {
  connectionStatus: 'connected' | 'disconnected';
}

const navItems = [
  { to: ROUTES.CHAT, label: 'Chat', icon: MessageSquare, shortcut: '1' },
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, shortcut: '2' },
  { to: ROUTES.ADMIN, label: 'Admin', icon: Settings, shortcut: '3' },
];

export function Sidebar({ connectionStatus }: SidebarProps) {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-800 bg-gray-950" data-testid="sidebar">
      <div className="flex items-center gap-2 px-4 py-4">
        <h1 className="text-lg font-bold text-white">Fluxmaster</h1>
      </div>

      <nav className="flex-1 px-2">
        {navItems.map(({ to, label, icon: Icon, shortcut }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200',
              )
            }
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            <span className="text-xs text-gray-600">{shortcut}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2 border-t border-gray-800 px-4 py-3 text-xs text-gray-500">
        <StatusDot status={connectionStatus} />
        <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
      </div>
    </aside>
  );
}
