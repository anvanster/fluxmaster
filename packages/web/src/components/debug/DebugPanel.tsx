import { useDebugStore } from '@/stores/debug-store';
import { useChatStore } from '@/stores/chat-store';
import { useRequestDetail, useRequestHistory } from '@/api/hooks/useRequests';
import { RequestListItem } from './RequestListItem';
import { RequestTimeline } from './RequestTimeline';
import { Button } from '@/components/common/Button';
import { X } from 'lucide-react';

export function DebugPanel() {
  const { selectedRequestId, selectRequest, setDebugPanelOpen } = useDebugStore();
  const activeAgentId = useChatStore((s) => s.activeAgentId);
  const { data: historyData } = useRequestHistory(activeAgentId, { limit: 50 });
  const { data: detail } = useRequestDetail(selectedRequestId);

  const requests = historyData?.requests ?? [];

  return (
    <div className="flex flex-col border-t border-gray-800 bg-gray-950 h-64" data-testid="debug-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <span className="text-xs font-medium text-gray-400">Debug Panel</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDebugPanelOpen(false)}
          aria-label="Close debug panel"
        >
          <X size={12} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Request list */}
        <div className="w-72 border-r border-gray-800 overflow-y-auto" data-testid="request-list">
          {requests.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 text-center">No requests yet</div>
          ) : (
            requests.map((req) => (
              <RequestListItem
                key={req.id}
                request={req}
                isSelected={req.id === selectedRequestId}
                onClick={() => selectRequest(req.id)}
              />
            ))
          )}
        </div>

        {/* Timeline detail */}
        <div className="flex-1 overflow-y-auto">
          {detail ? (
            <RequestTimeline request={detail} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Select a request to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
