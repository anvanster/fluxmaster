import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigEditor } from './ConfigEditor';

vi.mock('@/api/hooks/useConfig', () => ({
  useConfig: vi.fn(),
}));

import { useConfig } from '@/api/hooks/useConfig';
const mockUseConfig = vi.mocked(useConfig);

describe('ConfigEditor', () => {
  it('shows spinner while loading', () => {
    mockUseConfig.mockReturnValue({ isLoading: true, data: undefined } as ReturnType<typeof useConfig>);
    render(<ConfigEditor />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders config JSON', () => {
    mockUseConfig.mockReturnValue({
      isLoading: false,
      data: { models: { default: 'gpt-4o' } },
    } as ReturnType<typeof useConfig>);
    render(<ConfigEditor />);
    expect(screen.getByTestId('config-display')).toHaveTextContent('gpt-4o');
  });

  it('toggles to edit mode', () => {
    mockUseConfig.mockReturnValue({
      isLoading: false,
      data: { models: {} },
    } as ReturnType<typeof useConfig>);
    render(<ConfigEditor />);
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByTestId('config-textarea')).toBeInTheDocument();
  });

  it('toggles back to display mode on Cancel', () => {
    mockUseConfig.mockReturnValue({
      isLoading: false,
      data: { models: {} },
    } as ReturnType<typeof useConfig>);
    render(<ConfigEditor />);
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByTestId('config-display')).toBeInTheDocument();
  });
});
