import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { CreateAgentModal } from './CreateAgentModal';
import { Plus } from 'lucide-react';

export function AgentProvisioner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} data-testid="create-agent-btn">
        <Plus size={14} className="mr-1 inline" />
        Create Agent
      </Button>
      <CreateAgentModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
