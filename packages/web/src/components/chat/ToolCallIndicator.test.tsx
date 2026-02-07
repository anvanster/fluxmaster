import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
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

  it('shows expand chevron when result is available', () => {
    render(<ToolCallIndicator name="read_file" status="done" result="file contents here" />);
    expect(screen.getByTestId('tool-call-indicator')).toBeInTheDocument();
    // Result not visible until expanded
    expect(screen.queryByTestId('tool-call-result')).not.toBeInTheDocument();
  });

  it('expands to show result on click', async () => {
    const user = userEvent.setup();
    render(<ToolCallIndicator name="read_file" status="done" result="file contents here" />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByTestId('tool-call-result')).toBeInTheDocument();
    expect(screen.getByText('file contents here')).toBeInTheDocument();
  });

  it('collapses result on second click', async () => {
    const user = userEvent.setup();
    render(<ToolCallIndicator name="read_file" status="done" result="file contents here" />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByTestId('tool-call-result')).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(screen.queryByTestId('tool-call-result')).not.toBeInTheDocument();
  });

  it('shows error styling for error results', async () => {
    const user = userEvent.setup();
    render(<ToolCallIndicator name="read_file" status="error" result="File not found" isError />);
    await user.click(screen.getByRole('button'));
    const resultEl = screen.getByTestId('tool-call-result');
    expect(resultEl).toHaveClass('border-red-800');
    expect(screen.getByText('File not found')).toBeInTheDocument();
  });
});
