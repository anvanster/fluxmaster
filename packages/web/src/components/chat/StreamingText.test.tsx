import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingText } from './StreamingText';

describe('StreamingText', () => {
  it('renders streaming text', () => {
    render(<StreamingText text="Hello" />);
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  it('has streaming indicator', () => {
    render(<StreamingText text="Hello" />);
    expect(screen.getByTestId('streaming-text')).toBeInTheDocument();
  });
});
