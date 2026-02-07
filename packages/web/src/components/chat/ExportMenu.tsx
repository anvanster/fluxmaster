import { useState, useRef, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { ChatMessage } from '@/stores/chat-store';
import { exportAsJson, exportAsMarkdown, downloadFile, parseImportJson } from '@/lib/export';

interface ExportMenuProps {
  agentId: string;
  messages: ChatMessage[];
  onImport: (agentId: string, messages: ChatMessage[]) => void;
}

export function ExportMenu({ agentId, messages, onImport }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open]);

  const handleExportJson = () => {
    const json = exportAsJson(agentId, messages);
    downloadFile(json, `fluxmaster-${agentId}.json`, 'application/json');
    setOpen(false);
  };

  const handleExportMarkdown = () => {
    const md = exportAsMarkdown(agentId, messages);
    downloadFile(md, `fluxmaster-${agentId}.md`, 'text/markdown');
    setOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseImportJson(reader.result as string);
        onImport(result.agentId, result.messages);
      } catch {
        // Import errors are silently ignored for now
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-label="Export/Import"
      >
        <Download size={14} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded border border-gray-700 bg-gray-900 py-1 shadow-lg">
          <button
            onClick={handleExportJson}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportMarkdown}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800"
          >
            Export Markdown
          </button>
          <hr className="my-1 border-gray-700" />
          <button
            onClick={handleImportClick}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800"
          >
            Import JSON
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
