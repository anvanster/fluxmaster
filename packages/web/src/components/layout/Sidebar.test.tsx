import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

function renderSidebar(connectionStatus: 'connected' | 'disconnected' = 'connected') {
  return render(
    <MemoryRouter>
      <Sidebar connectionStatus={connectionStatus} />
    </MemoryRouter>,
  );
}

describe('Sidebar', () => {
  it('renders navigation links', () => {
    renderSidebar();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows Fluxmaster title', () => {
    renderSidebar();
    expect(screen.getByText('Fluxmaster')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    renderSidebar('connected');
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});
