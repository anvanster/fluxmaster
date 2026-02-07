import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationTitle } from './ConversationTitle';

describe('ConversationTitle', () => {
  it('renders the title text', () => {
    render(<ConversationTitle title="My Conversation" onSave={() => {}} />);
    expect(screen.getByText('My Conversation')).toBeInTheDocument();
  });

  it('shows "Untitled" when no title provided', () => {
    render(<ConversationTitle onSave={() => {}} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('enters edit mode on click and saves on blur', () => {
    const onSave = vi.fn();
    render(<ConversationTitle title="Old Title" onSave={onSave} />);

    fireEvent.click(screen.getByText('Old Title'));
    const input = screen.getByDisplayValue('Old Title');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith('New Title');
  });
});
