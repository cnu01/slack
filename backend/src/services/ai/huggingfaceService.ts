import axios from 'axios';
import { config } from '../../config';

interface ToneAnalysis {
  professional: number;
  urgent: number;
  supportive: number;
  casual: number;
}

interface SentimentResult {
  label: string;
  score: number;
}

class HuggingFaceService {
  private apiKey: string;
  private baseURL = 'https://api-inference.huggingface.co/models';

  constructor() {
    this.apiKey = config.HUGGINGFACE_API_KEY;
  }

  async analyzeSentiment(text: string): Promise<number> {
    try {
      const response = await axios.post(
        `${this.baseURL}/cardiffnlp/twitter-roberta-base-sentiment-latest`,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const results = response.data[0] as SentimentResult[];
      
      // Convert sentiment labels to scores
      let sentimentScore = 0.5; // neutral default
      
      for (const result of results) {
        if (result.label === 'LABEL_2') { // positive
          sentimentScore = 0.5 + (result.score * 0.5);
        } else if (result.label === 'LABEL_0') { // negative
          sentimentScore = 0.5 - (result.score * 0.5);
        }
      }

      return Math.max(0, Math.min(1, sentimentScore));
    } catch (error) {
      console.error('Hugging Face sentiment analysis error:', error);
      return 0.5; // neutral fallback
    }
  }

  async analyzeTone(text: string): Promise<ToneAnalysis> {
    try {
      // Use a simple keyword-based approach for tone analysis
      // In production, you might want to use a more sophisticated model
      const lowerText = text.toLowerCase();
      
      const toneKeywords = {
        professional: ['please', 'thank you', 'regards', 'sincerely', 'appreciate', 'kindly'],
        urgent: ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'deadline', 'rush'],
        supportive: ['help', 'support', 'assist', 'encourage', 'great job', 'well done', 'excellent'],
        casual: ['hey', 'hi', 'cool', 'awesome', 'yeah', 'ok', 'sure', 'lol', 'btw']
      };

      const scores: ToneAnalysis = {
        professional: 0,
        urgent: 0,
        supportive: 0,
        casual: 0
      };

      // Calculate scores based on keyword presence
      Object.entries(toneKeywords).forEach(([tone, keywords]) => {
        const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
        scores[tone as keyof ToneAnalysis] = Math.min(1, matches * 0.3);
      });

      // Normalize scores
      const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
      if (total > 0) {
        Object.keys(scores).forEach(key => {
          scores[key as keyof ToneAnalysis] = scores[key as keyof ToneAnalysis] / total;
        });
      } else {
        // Default to professional if no keywords found
        scores.professional = 0.7;
        scores.casual = 0.3;
      }

      return scores;
    } catch (error) {
      console.error('Tone analysis error:', error);
      return {
        professional: 0.7,
        urgent: 0.1,
        supportive: 0.1,
        casual: 0.1
      };
    }
  }

  determineImpact(text: string, toneAnalysis: ToneAnalysis): 'high' | 'medium' | 'low' {
    const urgentWords = ['urgent', 'critical', 'emergency', 'deadline', 'asap', 'immediately'];
    const highImpactWords = ['decision', 'important', 'meeting', 'project', 'budget', 'client'];
    
    const lowerText = text.toLowerCase();
    
    // High impact if urgent tone or contains urgent/important keywords
    if (toneAnalysis.urgent > 0.5 || urgentWords.some(word => lowerText.includes(word))) {
      return 'high';
    }
    
    // Medium impact if contains business-related keywords
    if (highImpactWords.some(word => lowerText.includes(word)) || text.length > 200) {
      return 'medium';
    }
    
    return 'low';
  }
}

export const huggingfaceService = new HuggingFaceService();
