export interface AiFeatureConfig {
  autoTitle: boolean;
  conversationSummary: boolean;
  suggestedFollowUps: boolean;
  model: string;
}

export interface ConversationTitle {
  conversationId: string;
  title: string;
  generatedAt: Date;
}

export interface SuggestedFollowUp {
  requestId: string;
  suggestions: string[];
  generatedAt: Date;
}
