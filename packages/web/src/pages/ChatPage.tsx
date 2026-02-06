import { Header } from '@/components/layout/Header';
import { ChatView } from '@/components/chat/ChatView';

export function ChatPage() {
  return (
    <>
      <Header title="Chat" />
      <ChatView />
    </>
  );
}
