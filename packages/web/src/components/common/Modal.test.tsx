import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders children when open', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Content</p>
      </Modal>,
    );
    expect(screen.queryByText('Content')).toBeNull();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders with title', () => {
    render(
      <Modal open onClose={vi.fn()} title="Test Title">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
