interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  return (
    <pre className={`overflow-auto rounded bg-gray-950 p-3 text-xs text-gray-300 ${className ?? ''}`}>
      <code>{children}</code>
    </pre>
  );
}
