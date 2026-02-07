interface SuggestedFollowUpsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function SuggestedFollowUps({ suggestions, onSelect }: SuggestedFollowUpsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2" data-testid="suggested-follow-ups">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          className="px-3 py-1 text-xs rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors border border-gray-700"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
