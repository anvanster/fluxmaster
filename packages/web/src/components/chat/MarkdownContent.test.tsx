import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownContent } from './MarkdownContent';

describe('MarkdownContent', () => {
  it('renders plain text', () => {
    render(<MarkdownContent content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders bold and italic', () => {
    render(<MarkdownContent content="**bold** and *italic*" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
  });

  it('renders inline code', () => {
    render(<MarkdownContent content="Use `console.log()` here" />);
    expect(screen.getByText('console.log()')).toBeInTheDocument();
  });

  it('renders code blocks with language label', () => {
    const md = '```typescript\nconst x = 1;\n```';
    render(<MarkdownContent content={md} />);
    expect(screen.getByTestId('code-block')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('renders unordered lists', () => {
    render(<MarkdownContent content={'- Item A\n- Item B'} />);
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
  });

  it('renders links with target blank', () => {
    render(<MarkdownContent content="[Google](https://google.com)" />);
    const link = screen.getByText('Google');
    expect(link).toHaveAttribute('href', 'https://google.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders blockquotes', () => {
    render(<MarkdownContent content="> This is a quote" />);
    expect(screen.getByText('This is a quote')).toBeInTheDocument();
  });
});
