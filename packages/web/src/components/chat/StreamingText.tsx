interface StreamingTextProps {
  text: string;
}

export function StreamingText({ text }: StreamingTextProps) {
  return (
    <div className="flex gap-3 px-4 py-3" data-testid="streaming-text">
      <div className="max-w-[80%] rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-100">
        <div className="whitespace-pre-wrap">
          {text}
          <span className="inline-block h-4 w-1 animate-pulse bg-blue-500 align-middle" />
        </div>
      </div>
    </div>
  );
}
