import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestedFollowUps } from './SuggestedFollowUps';

describe('SuggestedFollowUps', () => {
  it('renders suggestion chips', () => {
    render(
      <SuggestedFollowUps
        suggestions={['Tell me more', 'What else?', 'Explain further']}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Tell me more')).toBeInTheDocument();
    expect(screen.getByText('What else?')).toBeInTheDocument();
    expect(screen.getByText('Explain further')).toBeInTheDocument();
  });

  it('calls onSelect when a chip is clicked', () => {
    const onSelect = vi.fn();
    render(
      <SuggestedFollowUps
        suggestions={['Tell me more', 'What else?']}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText('Tell me more'));
    expect(onSelect).toHaveBeenCalledWith('Tell me more');
  });

  it('renders nothing when suggestions are empty', () => {
    const { container } = render(
      <SuggestedFollowUps suggestions={[]} onSelect={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
