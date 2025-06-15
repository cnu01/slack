export interface ToneAnalysis {
  professional: number;
  urgent: number;
  supportive: number;
  casual: number;
}

export interface MessageAnalysis {
  tone: ToneAnalysis;
  sentiment: number;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
}

export interface AutoReplyResponse {
  suggestions: string[];
}

export interface OrgBrainSearchResult {
  content: string;
  source: {
    messageId: string;
    channelName: string;
    author: string;
    timestamp: Date;
  };
  relevanceScore: number;
}

export interface OrgBrainResponse {
  query: string;
  aiResponse: string;
  results: OrgBrainSearchResult[];
  totalResults: number;
}

export interface ConversationSummary {
  summary: string;
  messageCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ToneIndicator {
  label: string;
  color: string;
  intensity: number;
}

export interface ImpactIndicator {
  level: 'high' | 'medium' | 'low';
  color: string;
  label: string;
}
