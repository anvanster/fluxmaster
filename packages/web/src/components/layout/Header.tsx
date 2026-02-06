import { Menu } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-12 items-center gap-3 border-b border-gray-800 bg-gray-950 px-4">
      <button onClick={toggleSidebar} className="text-gray-400 hover:text-white lg:hidden" aria-label="Toggle sidebar">
        <Menu size={20} />
      </button>
      <h2 className="text-sm font-medium text-gray-200">{title}</h2>
    </header>
  );
}
