import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PluginList } from './PluginList';

vi.mock('@/api/hooks/usePlugins', () => ({
  usePlugins: vi.fn(),
}));

import { usePlugins } from '@/api/hooks/usePlugins';
const mockUsePlugins = vi.mocked(usePlugins);

describe('PluginList', () => {
  it('shows empty state when no plugins', () => {
    mockUsePlugins.mockReturnValue({
      isLoading: false,
      data: [],
    } as unknown as ReturnType<typeof usePlugins>);
    render(<PluginList />);
    expect(screen.getByText('No plugins loaded')).toBeInTheDocument();
  });

  it('renders plugin names', () => {
    mockUsePlugins.mockReturnValue({
      isLoading: false,
      data: [{ package: '@fluxmaster/plugin-git', config: {} }],
    } as unknown as ReturnType<typeof usePlugins>);
    render(<PluginList />);
    expect(screen.getByText('@fluxmaster/plugin-git')).toBeInTheDocument();
  });
});
