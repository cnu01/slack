import OpenAI from 'openai';
import { config } from '../../config';

class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  async generateAutoReplies(messageContent: string, channelContext?: string, tone?: string): Promise<string[]> {
    try {
      const prompt = `
        Generate 3-4 professional auto-reply suggestions for the following message in a ${tone || 'professional'} tone.
        
        Context: ${channelContext || 'General workplace communication'}
        Message: "${messageContent}"
        
        Requirements:
        - Keep responses concise and relevant
        - Match the ${tone || 'professional'} tone
        - Provide varied response options
        - Make them contextually appropriate
        
        Return only the suggestions, one per line.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates professional workplace communication responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      return content.split('\n').filter(line => line.trim()).slice(0, 4);
    } catch (error) {
      console.error('OpenAI auto-reply generation error:', error);
      return [
        'Thank you for the message!',
        'I appreciate the update.',
        'Thanks for letting me know.',
        'Got it, thanks!'
      ];
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding generation error:', error);
      throw error;
    }
  }

  async summarizeConversation(messages: string[], messageCount: number): Promise<string> {
    try {
      const conversationText = messages.slice(-messageCount).join('\n');
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes workplace conversations concisely and professionally.'
          },
          {
            role: 'user',
            content: `Please summarize this conversation in 2-3 sentences, highlighting key points and decisions:\n\n${conversationText}`
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || 'Unable to generate summary.';
    } catch (error) {
      console.error('OpenAI summarization error:', error);
      throw error;
    }
  }

  async generateOrgBrainResponse(query: string, context: string[]): Promise<string> {
    try {
      const contextText = context.join('\n');
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that helps answer questions based on organizational knowledge and past conversations. Provide helpful, accurate responses based on the provided context.'
          },
          {
            role: 'user',
            content: `Question: ${query}\n\nRelevant context from past conversations:\n${contextText}\n\nPlease provide a helpful answer based on this context.`
          }
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      return response.choices[0]?.message?.content || 'I could not find relevant information to answer your question.';
    } catch (error) {
      console.error('OpenAI org brain response error:', error);
      throw error;
    }
  }
}

export const openaiService = new OpenAIService();
