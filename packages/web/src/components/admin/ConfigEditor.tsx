import { useState } from 'react';
import { useConfig } from '@/api/hooks/useConfig';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';

export function ConfigEditor() {
  const { data: config, isLoading } = useConfig();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (isLoading) return <Spinner />;

  const configText = JSON.stringify(config, null, 2);

  return (
    <Card data-testid="config-editor">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300">Configuration</h4>
        <button
          onClick={() => {
            if (!editing) setText(configText);
            setEditing(!editing);
          }}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded bg-gray-950 p-3 font-mono text-xs text-gray-300 focus:outline-none"
          rows={20}
          data-testid="config-textarea"
        />
      ) : (
        <pre className="overflow-auto rounded bg-gray-950 p-3 text-xs text-gray-300" data-testid="config-display">
          {configText}
        </pre>
      )}
    </Card>
  );
}
