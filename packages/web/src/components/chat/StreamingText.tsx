import type { ToolCallInfo } from '@/stores/chat-store';
import { ToolCallIndicator } from './ToolCallIndicator';

interface StreamingTextProps {
  text: string;
  toolCalls?: ToolCallInfo[];
}

export function StreamingText({ text, toolCalls }: StreamingTextProps) {
  return (
    <div className="flex gap-3 px-4 py-3" data-testid="streaming-text">
      <div className="max-w-[80%] rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-100">
        {toolCalls && toolCalls.length > 0 && (
          <div className="mb-2 space-y-1">
            {toolCalls.map((tc, i) => (
              <ToolCallIndicator key={i} name={tc.name} status={tc.status} result={tc.result} isError={tc.isError} args={tc.args} />
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {text}
          <span className="inline-block h-4 w-1 animate-pulse bg-blue-500 align-middle" />
        </div>
      </div>
    </div>
  );
}
