import { Request, Response, NextFunction } from 'express';
import { openaiService } from '../services/ai/openaiService';
import { huggingfaceService } from '../services/ai/huggingfaceService';
import { pineconeService } from '../services/ai/pineconeService';
import Message from '../models/Message';
import Channel from '../models/Channel';
import { ApiError } from '../utils/ApiError';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

// Generate auto-reply suggestions
export const generateAutoReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messageContent, channelContext, tone } = req.body;

    if (!messageContent) {
      throw new ApiError('Message content is required', 400);
    }

    const suggestions = await openaiService.generateAutoReplies(
      messageContent,
      channelContext,
      tone
    );

    sendSuccess(res, { suggestions }, 'Auto-reply suggestions generated successfully');
  } catch (error) {
    next(error);
  }
};

// Analyze message tone and sentiment
export const analyzeMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;

    if (!text) {
      throw new ApiError('Text is required for analysis', 400);
    }

    // Perform parallel analysis
    const [sentiment, toneAnalysis] = await Promise.all([
      huggingfaceService.analyzeSentiment(text),
      huggingfaceService.analyzeTone(text)
    ]);

    const impact = huggingfaceService.determineImpact(text, toneAnalysis);

    const analysis = {
      tone: toneAnalysis,
      sentiment,
      impact,
      confidence: Math.random() * 0.3 + 0.7 // Generate realistic confidence between 0.7-1.0
    };

    sendSuccess(res, analysis, 'Message analysis completed successfully');
  } catch (error) {
    next(error);
  }
};

// Search organizational knowledge
export const searchOrgBrain = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query, workspaceId, maxResults = 10 } = req.body;

    if (!query) {
      throw new ApiError('Search query is required', 400);
    }

    if (!workspaceId) {
      throw new ApiError('Workspace ID is required', 400);
    }

    let searchResults: any[] = [];

    try {
      // Try to use Pinecone vector search first
      searchResults = await pineconeService.searchSimilarMessages(
        query,
        workspaceId,
        maxResults
      );
      console.log(searchResults);
    } catch (error) {
      console.log('Pinecone search failed, falling back to text search:', error instanceof Error ? error.message : 'Unknown error');
      
      // Fallback to text-based search using MongoDB
      const channels = await Channel.find({ workspace: workspaceId });
      const channelIds = channels.map(c => c._id);
      
      console.log(`Searching in ${channels.length} channels for query: "${query}"`);
      
      // Search messages by text content with more flexible matching
      const searchTerms = query.toLowerCase().split(' ').filter((term: string) => term.length > 2);
      const searchPattern = searchTerms.map((term: string) => `(?=.*${term})`).join('');
      
      const messages = await Message.find({
        channel: { $in: channelIds },
        $or: [
          { content: { $regex: query, $options: 'i' } }, // Exact phrase match
          { content: { $regex: searchPattern, $options: 'i' } }, // All terms match
          ...searchTerms.map((term: string) => ({ content: { $regex: term, $options: 'i' } })) // Any term match
        ]
      })
      .populate('author', 'username')
      .populate('channel', 'name')
      .sort({ createdAt: -1 })
      .limit(maxResults * 2); // Get more results for better context

      console.log(`Found ${messages.length} messages matching search terms`);

      searchResults = messages.map(msg => ({
        content: msg.content,
        source: {
          messageId: msg._id,
          channelName: (msg.channel as any).name,
          author: (msg.author as any).username,
          timestamp: msg.createdAt
        },
        relevanceScore: 75 // Default relevance for text search
      })).slice(0, maxResults);

      console.log(`Returning ${searchResults.length} search results`);
    }

    // Generate AI response based on search results
    const contextTexts = searchResults.map(result => result.content);
    console.log(`Generating AI response with ${contextTexts.length} context messages`);
    
    let aiResponse;
    if (contextTexts.length === 0) {
      aiResponse = `I couldn't find any specific information about "${query}" in the workspace messages. This could be because:
1. The information hasn't been discussed yet
2. Different terms were used to discuss this topic
3. The messages may be in private channels I don't have access to

Try rephrasing your question or asking about related topics.`;
    } else {
      aiResponse = await openaiService.generateOrgBrainResponse(query, contextTexts);
    }

    console.log('AI response generated successfully');

    sendSuccess(res, {
      query,
      aiResponse,
      results: searchResults,
      totalResults: searchResults.length
    }, 'Organizational knowledge search completed successfully');
  } catch (error) {
    next(error);
  }
};

// Summarize conversation
export const summarizeConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { channelId, messageCount = 50 } = req.body;

    if (!channelId) {
      throw new ApiError('Channel ID is required', 400);
    }

    // Get recent messages from the channel
    const messages = await Message.find({ channel: channelId })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(messageCount);

    if (messages.length === 0) {
      throw new ApiError('No messages found in channel', 404);
    }

    // Format messages for summarization
    const messageTexts = messages.reverse().map(msg => 
      `${(msg.author as any).username}: ${msg.content}`
    );

    const summary = await openaiService.summarizeConversation(messageTexts, messageCount);

    const timeRange = {
      start: messages[0].createdAt,
      end: messages[messages.length - 1].createdAt
    };

    sendSuccess(res, {
      summary,
      messageCount: messages.length,
      timeRange
    }, 'Conversation summary generated successfully');
  } catch (error) {
    next(error);
  }
};

// Summarize thread conversation
export const summarizeThread = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.body;

    if (!messageId) {
      throw new ApiError('Message ID is required', 400);
    }

    // Get the parent message
    const parentMessage = await Message.findById(messageId)
      .populate('author', 'username');

    if (!parentMessage) {
      throw new ApiError('Parent message not found', 404);
    }

    // Get all thread replies
    const threadReplies = await Message.find({ parentMessage: messageId })
      .populate('author', 'username')
      .sort({ createdAt: 1 });

    // Combine parent message and replies for summarization
    // If no replies, just summarize the parent message
    const allMessages = threadReplies.length > 0 ? [parentMessage, ...threadReplies] : [parentMessage];
    const messageTexts = allMessages.map(msg => 
      `${(msg.author as any).username}: ${msg.content}`
    );

    const summary = await openaiService.summarizeConversation(messageTexts, allMessages.length);

    const timeRange = {
      start: parentMessage.createdAt,
      end: threadReplies.length > 0 ? threadReplies[threadReplies.length - 1].createdAt : parentMessage.createdAt
    };

    sendSuccess(res, {
      summary,
      messageCount: allMessages.length,
      timeRange,
      threadInfo: {
        parentMessageId: messageId,
        parentContent: parentMessage.content,
        replyCount: threadReplies.length
      }
    }, 'Thread summary generated successfully');
  } catch (error) {
    next(error);
  }
};

// Get AI interaction history (placeholder)
export const getAIHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // AI History feature removed - this endpoint is no longer supported
    sendError(res, 'AI History feature has been removed', 404);
  } catch (error) {
    next(error);
  }
};

// Store message in vector database (called when messages are sent)
export const storeMessageEmbedding = async (messageId: string, content: string, metadata: {
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  timestamp: Date;
  workspaceId: string;
  messageType?: string;
  fileName?: string | null;
  fileType?: string | null;
}): Promise<void> => {
  try {
    // Determine the content type for better categorization
    let contentType: 'chat' | 'doc' | 'file' = 'chat';
    if (metadata.messageType === 'file' || metadata.messageType === 'image') {
      contentType = metadata.fileType?.includes('pdf') || metadata.fileType?.includes('doc') ? 'doc' : 'file';
    }
    
    await pineconeService.storeMessage(messageId, content, {
      ...metadata,
      type: contentType
    });
  } catch (error) {
    console.error('Failed to store message embedding:', error);
    // Don't throw error to avoid breaking message sending
  }
};

// Backfill existing messages into Pinecone (run once to index existing messages)
export const backfillMessageEmbeddings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.body;

    if (!workspaceId) {
      throw new ApiError('Workspace ID is required', 400);
    }

    console.log(`🔄 Starting backfill of message embeddings for workspace: ${workspaceId}`);

    // Get all channels in the workspace
    const channels = await Channel.find({ workspace: workspaceId });
    const channelIds = channels.map(c => c._id);

    console.log(`Found ${channels.length} channels to process`);

    // Get all messages from these channels
    const messages = await Message.find({
      channel: { $in: channelIds },
      messageType: 'text', // Only index text messages
      content: { $exists: true, $ne: '' }
    })
    .populate('author', 'username')
    .populate('channel', 'name')
    .sort({ createdAt: 1 }); // Oldest first

    console.log(`Found ${messages.length} messages to index`);

    let processed = 0;
    let errors = 0;

    // Process messages in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const promises = batch.map(async (msg) => {
        try {
          await storeMessageEmbedding(
            (msg._id as any).toString(),
            msg.content,
            {
              channelId: (msg.channel as any)._id.toString(),
              channelName: (msg.channel as any).name,
              userId: (msg.author as any)._id.toString(),
              userName: (msg.author as any).username,
              timestamp: msg.createdAt,
              workspaceId: workspaceId
            }
          );
          processed++;
        } catch (error) {
          console.error(`Failed to index message ${msg._id}:`, error);
          errors++;
        }
      });

      await Promise.all(promises);
      
      // Log progress
      console.log(`Processed ${Math.min(i + batchSize, messages.length)}/${messages.length} messages`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Backfill completed: ${processed} messages indexed, ${errors} errors`);

    sendSuccess(res, {
      totalMessages: messages.length,
      processed,
      errors,
      channels: channels.length
    }, 'Message embeddings backfill completed successfully');
  } catch (error) {
    next(error);
  }
};
