import { useState, useRef, useEffect } from 'react';

interface ConversationTitleProps {
  title?: string;
  onSave: (title: string) => void;
}

export function ConversationTitle({ title, onSave }: ConversationTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(title ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditText(title ?? '');
  }, [title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="text-sm font-medium text-gray-200 bg-transparent border-b border-gray-600 outline-none px-1"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        data-testid="conversation-title-input"
      />
    );
  }

  return (
    <button
      className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors truncate max-w-xs"
      onClick={() => setIsEditing(true)}
      data-testid="conversation-title"
    >
      {title || 'Untitled'}
    </button>
  );
}
