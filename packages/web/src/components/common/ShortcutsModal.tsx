import { Modal } from './Modal';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);
const mod = isMac ? 'Cmd' : 'Ctrl';

const shortcuts = [
  { keys: `${mod}+K`, description: 'Open command palette' },
  { keys: `${mod}+1`, description: 'Go to Chat' },
  { keys: `${mod}+2`, description: 'Go to Dashboard' },
  { keys: `${mod}+3`, description: 'Go to Admin' },
  { keys: `${mod}+/`, description: 'Focus chat input' },
  { keys: '?', description: 'Show this help' },
  { keys: 'Escape', description: 'Close modal / palette' },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      <table className="w-full text-sm" data-testid="shortcuts-table">
        <tbody>
          {shortcuts.map(({ keys, description }) => (
            <tr key={keys} className="border-t border-gray-800 first:border-0">
              <td className="py-2 text-gray-400">
                <kbd className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-gray-200">
                  {keys}
                </kbd>
              </td>
              <td className="py-2 text-gray-300">{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
