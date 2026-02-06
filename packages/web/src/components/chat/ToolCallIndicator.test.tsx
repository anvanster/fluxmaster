import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolCallIndicator } from './ToolCallIndicator';

describe('ToolCallIndicator', () => {
  it('renders tool name', () => {
    render(<ToolCallIndicator name="read_file" status="pending" />);
    expect(screen.getByText('read_file')).toBeInTheDocument();
  });

  it('shows spinner when pending', () => {
    render(<ToolCallIndicator name="read_file" status="pending" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with done status', () => {
    render(<ToolCallIndicator name="write_file" status="done" />);
    expect(screen.getByTestId('tool-call-indicator')).toBeInTheDocument();
  });
});
