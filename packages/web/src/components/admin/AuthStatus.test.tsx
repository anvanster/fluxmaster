import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthStatus } from './AuthStatus';

vi.mock('@/api/hooks/useAuth', () => ({
  useAuthStatus: vi.fn(),
}));

import { useAuthStatus } from '@/api/hooks/useAuth';
const mockUseAuthStatus = vi.mocked(useAuthStatus);

describe('AuthStatus', () => {
  it('shows spinner while loading', () => {
    mockUseAuthStatus.mockReturnValue({ isLoading: true, data: undefined } as ReturnType<typeof useAuthStatus>);
    render(<AuthStatus />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders auth status fields', () => {
    mockUseAuthStatus.mockReturnValue({
      isLoading: false,
      data: {
        copilotConfigured: true,
        copilotReady: false,
        claudeCli: true,
        directProviders: ['anthropic'],
      },
    } as ReturnType<typeof useAuthStatus>);
    render(<AuthStatus />);
    expect(screen.getByText('Copilot Configured')).toBeInTheDocument();
    expect(screen.getByText('Claude CLI')).toBeInTheDocument();
    expect(screen.getByText('anthropic')).toBeInTheDocument();
  });

  it('shows None when no direct providers', () => {
    mockUseAuthStatus.mockReturnValue({
      isLoading: false,
      data: {
        copilotConfigured: false,
        copilotReady: false,
        claudeCli: false,
        directProviders: [],
      },
    } as ReturnType<typeof useAuthStatus>);
    render(<AuthStatus />);
    expect(screen.getByText('None')).toBeInTheDocument();
  });
});
