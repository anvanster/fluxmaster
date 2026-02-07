import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

export interface Command {
  id: string;
  label: string;
  category: string;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const filtered = search
    ? commands.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()))
    : commands;

  const categories = [...new Set(filtered.map((c) => c.category))];

  const flatItems = categories.flatMap((cat) => filtered.filter((c) => c.category === cat));

  const executeCommand = (cmd: Command) => {
    cmd.action();
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatItems.length > 0) {
      e.preventDefault();
      executeCommand(flatItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let itemIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          className="w-full border-b border-gray-700 bg-transparent px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
        />

        <div className="max-h-64 overflow-y-auto py-2">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="px-4 py-1 text-xs font-medium text-gray-500">{cat}</div>
              {filtered
                .filter((c) => c.category === cat)
                .map((cmd) => {
                  const idx = itemIndex++;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm ${
                        idx === selectedIndex
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800/50'
                      }`}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <span className="text-xs text-gray-500">{cmd.shortcut}</span>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
          {flatItems.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">No commands found</div>
          )}
        </div>
      </div>
    </div>
  );
}
