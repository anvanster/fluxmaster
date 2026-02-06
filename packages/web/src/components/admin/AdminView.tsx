import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ConfigEditor } from './ConfigEditor';
import { AgentProvisioner } from './AgentProvisioner';
import { McpServerList } from './McpServerList';
import { PluginList } from './PluginList';
import { AuthStatus } from './AuthStatus';

const tabs = ['Config', 'Agents', 'MCP', 'Plugins', 'Auth'] as const;
type Tab = typeof tabs[number];

export function AdminView() {
  const [activeTab, setActiveTab] = useState<Tab>('Config');

  return (
    <div className="flex-1 overflow-y-auto" data-testid="admin-view">
      <div className="flex border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400 hover:text-gray-200',
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-6">
        {activeTab === 'Config' && <ConfigEditor />}
        {activeTab === 'Agents' && <AgentProvisioner />}
        {activeTab === 'MCP' && <McpServerList />}
        {activeTab === 'Plugins' && <PluginList />}
        {activeTab === 'Auth' && <AuthStatus />}
      </div>
    </div>
  );
}
