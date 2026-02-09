import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, maxWidth, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      data-testid="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`mx-4 max-h-[85vh] w-full ${maxWidth ?? 'max-w-lg'} overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
