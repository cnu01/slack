import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../../config';
import { openaiService } from './openaiService';

interface SearchResult {
  content: string;
  source: {
    messageId: string;
    channelName: string;
    author: string;
    timestamp: Date;
  };
  relevanceScore: number;
}

class PineconeService {
  private client: Pinecone | null;
  private indexName: string;
  private isEnabled: boolean;

  constructor() {
    this.indexName = config.PINECONE_INDEX_NAME;
    this.isEnabled = !!config.PINECONE_API_KEY;
    
    if (this.isEnabled) {
      this.client = new Pinecone({
        apiKey: config.PINECONE_API_KEY,
      });
    } else {
      this.client = null;
      console.warn('Pinecone API key not found - vector search will be disabled');
    }
  }

  async initializeIndex(): Promise<void> {
    if (!this.client) {
      console.warn('Pinecone client not initialized - skipping index creation');
      return;
    }
    
    try {
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.indexes?.some((index: any) => index.name === this.indexName);

      if (!indexExists) {
        console.log(`🔄 Creating Pinecone serverless index: ${this.indexName}`);
        
        // Create the index automatically
        await this.client.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI embedding dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        console.log(`✅ Pinecone index '${this.indexName}' created successfully!`);
        
        // Wait a bit for the index to be ready
        console.log('⏳ Waiting for index to be ready...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
      } else {
        console.log(`✅ Pinecone index '${this.indexName}' already exists and is ready.`);
      }
    } catch (error) {
      console.error('Pinecone index initialization error:', error);
      console.log(`📝 If automatic creation failed, please create this index manually in Pinecone Console:`);
      console.log(`   - Name: ${this.indexName}`);
      console.log(`   - Dimensions: 1536`);
      console.log(`   - Metric: cosine`);
      console.log(`   - Cloud: AWS, Region: us-east-1 (free tier)`);
      console.log(`   - Plan: Serverless (free)`);
      console.log(`   - URL: https://app.pinecone.io/`);
    }
  }

  async storeMessage(messageId: string, content: string, metadata: {
    channelId: string;
    channelName: string;
    userId: string;
    userName: string;
    timestamp: Date;
    workspaceId: string;
    type: 'chat' | 'doc' | 'task' | 'file'; // add more as needed
  }): Promise<void> {
    if (!this.client) {
      console.warn('Pinecone client not initialized - skipping message storage');
      return;
    }
    
    try {
      const embedding = await openaiService.generateEmbedding(content);
      const index = this.client.index(this.indexName);

      await index.upsert([
        {
          id: messageId,
          values: embedding,
          metadata: {
            content,
            type: metadata.type,
            workspaceId: metadata.workspaceId,
            channelId: metadata.channelId,
            channelName: metadata.channelName,
            userId: metadata.userId,
            userName: metadata.userName,
            timestamp: metadata.timestamp.toISOString(),
          }
        }
      ]);
    } catch (error) {
      console.error('Pinecone store message error:', error);
    }
  }

  async searchSimilarMessages(query: string, workspaceId: string, maxResults: number = 10): Promise<SearchResult[]> {
    if (!this.client) {
      console.warn('Pinecone client not initialized - returning empty search results');
      return [];
    }
    
    try {
      const queryEmbedding = await openaiService.generateEmbedding(query);
      const index = this.client.index(this.indexName);

      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK: maxResults,
        includeMetadata: true,
        filter: {
          workspaceId: { $eq: workspaceId }
        }
      });

      const results: SearchResult[] = [];

      for (const match of searchResponse.matches || []) {
        if (match.metadata && match.score && match.score > 0.7) {
          results.push({
            content: match.metadata.content as string,
            source: {
              messageId: match.id,
              channelName: match.metadata.channelName as string,
              author: match.metadata.userName as string,
              timestamp: new Date(match.metadata.timestamp as string),
            },
            relevanceScore: Math.round(match.score * 100),
          });
        }
      }

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('Pinecone search error:', error);
      return [];
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.client) {
      console.warn('Pinecone client not initialized - skipping message deletion');
      return;
    }
    
    try {
      const index = this.client.index(this.indexName);
      await index.deleteOne(messageId);
    } catch (error) {
      console.error('Pinecone delete message error:', error);
    }
  }
}

export const pineconeService = new PineconeService();
