export const TITLE_PROMPT = `Generate a short, descriptive title (max 50 chars) for this conversation based on the user's first message and the assistant's response. Return ONLY the title text, nothing else.

User: {userMessage}
Assistant: {assistantMessage}`;

export const SUGGESTIONS_PROMPT = `Based on this conversation, suggest 3 brief follow-up questions or prompts the user might want to ask next. Return them as a JSON array of strings.

Context:
User: {userMessage}
Assistant: {assistantMessage}

Return ONLY a JSON array like: ["suggestion 1", "suggestion 2", "suggestion 3"]`;

export const SUMMARY_PROMPT = `Summarize this conversation in 1-2 sentences. Focus on what was discussed and any key outcomes.

Messages:
{messages}

Return ONLY the summary text.`;
