import { usePlugins } from '@/api/hooks/usePlugins';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/Spinner';

export function PluginList() {
  const { data: plugins, isLoading } = usePlugins();

  if (isLoading) return <Spinner />;
  if (!plugins || plugins.length === 0) {
    return <EmptyState title="No plugins loaded" />;
  }

  return (
    <div className="space-y-2" data-testid="plugin-list">
      {plugins.map((plugin) => (
        <Card key={plugin.package}>
          <span className="text-sm font-medium text-white">{plugin.package}</span>
        </Card>
      ))}
    </div>
  );
}
