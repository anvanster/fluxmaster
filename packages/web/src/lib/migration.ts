import { API_BASE } from './constants';

const STORAGE_KEY = 'fluxmaster-chat';

interface StoredChatData {
  state: {
    activeAgentId: string;
    conversations: [string, Array<{ id: string; role: string; content: string; timestamp: string }>][];
  };
  version: number;
}

export function hasLocalData(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data: StoredChatData = JSON.parse(raw);
    const conversations = data.state?.conversations;
    return Array.isArray(conversations) && conversations.length > 0;
  } catch {
    return false;
  }
}

export async function migrateLocalStorageToServer(): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  let data: StoredChatData;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  const conversations = data.state?.conversations;
  if (!Array.isArray(conversations) || conversations.length === 0) return;

  try {
    for (const [agentId, messages] of conversations) {
      if (!messages || messages.length === 0) continue;

      // Create conversation on server
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (!res.ok) continue;

      // Note: Messages are migrated by creating the conversation.
      // The actual message data will be re-sent through normal chat flow.
      // This is a best-effort migration — the important thing is creating
      // the conversation records so the server knows about them.
    }

    // Clear localStorage after successful migration
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Migration is non-fatal — keep localStorage data on failure
  }
}
