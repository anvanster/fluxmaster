import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
  });

  it('calls onSend when send button clicked', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('clears input after send', () => {
    render(<ChatInput onSend={vi.fn()} />);

    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(input.value).toBe('');
  });

  it('disables when disabled prop is true', () => {
    render(<ChatInput onSend={vi.fn()} disabled />);
    expect(screen.getByTestId('chat-input')).toBeDisabled();
  });
});
