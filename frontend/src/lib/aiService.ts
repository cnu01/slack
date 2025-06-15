import { apiClient } from './api';
import type { 
  MessageAnalysis, 
  AutoReplyResponse, 
  OrgBrainResponse, 
  ConversationSummary,
  ToneIndicator,
  ImpactIndicator
} from '../types/ai';

class AIService {
  private analysisCache = new Map<string, { analysis: MessageAnalysis; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Real-time message analysis with caching
  async analyzeMessage(text: string): Promise<MessageAnalysis> {
    if (!text.trim()) {
      return this.getDefaultAnalysis();
    }

    // Check cache first
    const cached = this.analysisCache.get(text);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return this.validateAnalysis(cached.analysis);
    }

    try {
      const response = await apiClient.analyzeMessage(text);
      const validatedResponse = this.validateAnalysis(response);
      this.analysisCache.set(text, { analysis: validatedResponse, timestamp: Date.now() });
      return validatedResponse;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getDefaultAnalysis();
    }
  }

  // Generate auto-reply suggestions
  async generateAutoReply(messageContent: string, channelContext?: string, tone?: string): Promise<string[]> {
    try {
      const response: AutoReplyResponse = await apiClient.generateAutoReply(messageContent, channelContext, tone);
      // Ensure we always return an array
      if (response && Array.isArray(response.suggestions)) {
        return response.suggestions;
      } else if (response && response.suggestions) {
        console.warn('Response suggestions is not an array:', response.suggestions);
        return [String(response.suggestions)];
      } else {
        console.warn('Response missing suggestions field:', response);
        return this.getFallbackReplies();
      }
    } catch (error) {
      console.error('Auto-reply generation failed:', error);
      return this.getFallbackReplies();
    }
  }

  // Search organizational knowledge
  async searchOrgBrain(query: string, workspaceId: string, maxResults = 3): Promise<OrgBrainResponse> {
    try {
      return await apiClient.searchOrgBrain(query, workspaceId, maxResults);
    } catch (error) {
      console.error('Org brain search failed:', error);
      throw error;
    }
  }

  // Generate conversation summary
  async summarizeConversation(channelId: string, messageCount = 50): Promise<ConversationSummary> {
    try {
      return await apiClient.summarizeConversation(channelId, messageCount);
    } catch (error) {
      console.error('Conversation summarization failed:', error);
      throw error;
    }
  }

  // Generate thread summary
  async summarizeThread(messageId: string): Promise<ConversationSummary & { threadInfo?: any }> {
    try {
      return await apiClient.summarizeThread(messageId);
    } catch (error) {
      console.error('Thread summarization failed:', error);
      throw error;
    }
  }

  // Helper methods
  getToneIndicators(analysis: MessageAnalysis): ToneIndicator[] {
    const indicators: ToneIndicator[] = [];
    
    // Defensive check: ensure analysis and tone exist
    if (!analysis || !analysis.tone) {
      console.warn('getToneIndicators: analysis or tone is undefined', analysis);
      return indicators;
    }

    const { tone } = analysis;
    
    if (typeof tone.professional === 'number' && tone.professional > 0.3) {
      indicators.push({
        label: 'Professional',
        color: 'blue',
        intensity: tone.professional
      });
    }
    
    if (typeof tone.urgent === 'number' && tone.urgent > 0.3) {
      indicators.push({
        label: 'Urgent',
        color: 'red',
        intensity: tone.urgent
      });
    }
    
    if (typeof tone.supportive === 'number' && tone.supportive > 0.3) {
      indicators.push({
        label: 'Supportive',
        color: 'green',
        intensity: tone.supportive
      });
    }
    
    if (typeof tone.casual === 'number' && tone.casual > 0.3) {
      indicators.push({
        label: 'Casual',
        color: 'purple',
        intensity: tone.casual
      });
    }

    return indicators;
  }

  getImpactIndicator(impact: 'high' | 'medium' | 'low' | undefined): ImpactIndicator {
    // Defensive check for undefined impact
    if (!impact) {
      console.warn('getImpactIndicator: impact is undefined, defaulting to medium');
      return { level: 'medium', color: 'yellow', label: 'Medium Impact' };
    }
    
    switch (impact) {
      case 'high':
        return { level: 'high', color: 'red', label: 'High Impact' };
      case 'medium':
        return { level: 'medium', color: 'yellow', label: 'Medium Impact' };
      case 'low':
        return { level: 'low', color: 'green', label: 'Low Impact' };
      default:
        console.warn('getImpactIndicator: unknown impact level:', impact);
        return { level: 'medium', color: 'yellow', label: 'Medium Impact' };
    }
  }

  getSentimentColor(sentiment: number | undefined): string {
    if (typeof sentiment !== 'number') {
      console.warn('getSentimentColor: sentiment is not a number:', sentiment);
      return 'yellow'; // Default to neutral
    }
    if (sentiment < 0.3) return 'red';
    if (sentiment > 0.7) return 'green';
    return 'yellow';
  }

  getSentimentLabel(sentiment: number | undefined): string {
    if (typeof sentiment !== 'number') {
      console.warn('getSentimentLabel: sentiment is not a number:', sentiment);
      return 'Neutral'; // Default to neutral
    }
    if (sentiment < 0.3) return 'Negative';
    if (sentiment > 0.7) return 'Positive';
    return 'Neutral';
  }

  // Export summary as markdown
  exportSummaryAsMarkdown(summary: ConversationSummary, channelName: string): void {
    const timeRangeText = summary.timeRange 
      ? `${new Date(summary.timeRange.start).toLocaleDateString()} - ${new Date(summary.timeRange.end).toLocaleDateString()}`
      : 'N/A';
      
    const markdown = `# Meeting Notes - ${channelName}

**Generated on:** ${new Date().toLocaleDateString()}
**Time Range:** ${timeRangeText}
**Messages Analyzed:** ${summary.messageCount || 0}

## Summary

${summary.summary || 'No summary available'}

---
*Generated by AI Assistant*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${channelName}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export thread summary as markdown
  exportThreadSummaryAsMarkdown(summary: ConversationSummary & { threadInfo?: any }, channelName: string): void {
    const threadInfo = summary.threadInfo || {};
    const markdown = `# Thread Summary - ${channelName}

**Generated on:** ${new Date().toLocaleDateString()}
**Time Range:** ${summary.timeRange ? `${new Date(summary.timeRange.start).toLocaleDateString()} - ${new Date(summary.timeRange.end).toLocaleDateString()}` : 'N/A'}
**Messages Analyzed:** ${summary.messageCount || 0}
**Thread Replies:** ${threadInfo.replyCount || 0}

## Original Message
${threadInfo.parentContent || 'N/A'}

## Thread Summary

${summary.summary || 'No summary available'}

---
*Generated by AI Assistant*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thread-summary-${channelName}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private getDefaultAnalysis(): MessageAnalysis {
    return {
      tone: {
        professional: 0.5,
        urgent: 0.1,
        supportive: 0.2,
        casual: 0.2
      },
      sentiment: 0.5,
      impact: 'medium',
      confidence: 0.5
    };
  }

  private getFallbackReplies(): string[] {
    return [
      "Thanks for the message!",
      "I appreciate the update.",
      "Got it, thanks!",
      "Thanks for letting me know."
    ];
  }

  // Validate and fix analysis objects to prevent runtime errors
  private validateAnalysis(analysis: any): MessageAnalysis {
    if (!analysis || typeof analysis !== 'object') {
      console.warn('validateAnalysis: analysis is not an object, using default');
      return this.getDefaultAnalysis();
    }

    const defaultAnalysis = this.getDefaultAnalysis();
    
    // Ensure tone object exists and has all required properties
    if (!analysis.tone || typeof analysis.tone !== 'object') {
      console.warn('validateAnalysis: tone is missing or invalid, using default');
      analysis.tone = defaultAnalysis.tone;
    } else {
      // Validate individual tone properties
      if (typeof analysis.tone.professional !== 'number') analysis.tone.professional = defaultAnalysis.tone.professional;
      if (typeof analysis.tone.urgent !== 'number') analysis.tone.urgent = defaultAnalysis.tone.urgent;
      if (typeof analysis.tone.supportive !== 'number') analysis.tone.supportive = defaultAnalysis.tone.supportive;
      if (typeof analysis.tone.casual !== 'number') analysis.tone.casual = defaultAnalysis.tone.casual;
    }

    // Validate sentiment
    if (typeof analysis.sentiment !== 'number') {
      console.warn('validateAnalysis: sentiment is not a number, using default');
      analysis.sentiment = defaultAnalysis.sentiment;
    }

    // Validate impact
    if (!['high', 'medium', 'low'].includes(analysis.impact)) {
      console.warn('validateAnalysis: impact is invalid, using default');
      analysis.impact = defaultAnalysis.impact;
    }

    // Validate confidence
    if (typeof analysis.confidence !== 'number') {
      console.warn('validateAnalysis: confidence is not a number, using default');
      analysis.confidence = defaultAnalysis.confidence;
    }

    return analysis as MessageAnalysis;
  }
}

export const aiService = new AIService();
