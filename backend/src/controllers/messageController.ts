import { Response } from 'express';
import Message from '../models/Message';
import Channel from '../models/Channel';
import Workspace from '../models/Workspace';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { socketManager } from '../app';
import { storeMessageEmbedding } from './aiController';

// Helper function to generate DM conversation ID
const getDMConversationId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort();
  return `dm-${ids.join('-')}`;
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { channelId, otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let actualChannelId = channelId;

    // Handle DM messages
    if (otherUserId) {
      // Verify the other user exists
      const otherUser = await User.findById(otherUserId);
      if (!otherUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Generate DM conversation ID
      actualChannelId = getDMConversationId(userId, otherUserId);
    } else {
      // Handle channel messages - existing logic
      const channel = await Channel.findById(channelId).populate('workspace');
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }

      // Check workspace membership
      const workspace = await Workspace.findById(channel.workspace);
      if (!workspace || !workspace.members.some(member => member.toString() === userId)) {
        res.status(403).json({ error: 'Access denied to this workspace' });
        return;
      }

      // Check channel membership for private channels
      if (channel.isPrivate && !channel.members.some(member => member.toString() === userId)) {
        res.status(403).json({ error: 'Access denied to this channel' });
        return;
      }
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({ 
      channel: actualChannelId,
      threadId: { $exists: false } // Only get parent messages, not thread replies
    })
      .populate('author', 'username profession avatar')
      .populate('threadReplies', 'content author createdAt')
      .populate('pinnedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Reverse to get chronological order (oldest first)
    const reversedMessages = messages.reverse();

    res.json({ 
      messages: reversedMessages,
      hasMore: messages.length === limitNum
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { channelId, otherUserId } = req.params;
    const { 
      content, 
      messageType = 'text', 
      replyTo, // Keep for backward compatibility
      threadId, // New threading support
      fileUrl,
      fileName, 
      fileSize,
      fileType
    } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // For file messages, content can be empty; for text messages, content is required
    if (messageType === 'text' && (!content || content.trim() === '')) {
      res.status(400).json({ error: 'Message content is required for text messages' });
      return;
    }

    // For file messages, validate file data
    if ((messageType === 'file' || messageType === 'image') && !fileUrl) {
      res.status(400).json({ error: 'File URL is required for file messages' });
      return;
    }

    let actualChannelId = channelId;
    let workspaceId = null;

    // Handle DM messages
    if (otherUserId) {
      // Verify the other user exists
      const otherUser = await User.findById(otherUserId);
      if (!otherUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Generate DM conversation ID
      actualChannelId = getDMConversationId(userId, otherUserId);
    } else {
      // Handle channel messages - existing logic
      const channel = await Channel.findById(channelId).populate('workspace');
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }

      // Check workspace membership
      const workspace = await Workspace.findById(channel.workspace);
      if (!workspace || !workspace.members.some(member => member.toString() === userId)) {
        res.status(403).json({ error: 'Access denied to this workspace' });
        return;
      }

      // Check channel membership for private channels
      if (channel.isPrivate && !channel.members.some(member => member.toString() === userId)) {
        res.status(403).json({ error: 'Access denied to this channel' });
        return;
      }

      workspaceId = workspace._id;
    }

    // Create the message
    const messageData: any = {
      content: content ? content.trim() : '', // Handle empty content for file messages
      author: userId,
      channel: actualChannelId,
      workspace: workspaceId, // null for DMs
      messageType,
      // Support both old replyTo and new threadId for backward compatibility
      threadId: threadId || replyTo || undefined,
      replyTo: replyTo || threadId || undefined, // Set replyTo for backward compatibility
      mentions: [], // Initialize empty mentions array
      reactions: [], // Initialize empty reactions array
      isPinned: false
    };

    // Add file data if this is a file message
    if (messageType === 'file' || messageType === 'image') {
      messageData.fileUrl = fileUrl;
      messageData.fileName = fileName;
      messageData.fileSize = fileSize;
      messageData.fileType = fileType;
    }

    const message = new Message(messageData);

    await message.save();

    // Store message embedding for AI search (text messages, files, and documents in channels with workspace)
    if ((messageType === 'text' || messageType === 'file' || messageType === 'image') && workspaceId) {
      try {
        const channel = await Channel.findById(channelId);
        const user = await User.findById(userId);
        
        if (channel && user) {
          // Prepare content for indexing
          let indexContent = content.trim();
          
          // For files, include filename and type for better searchability
          if (messageType === 'file' || messageType === 'image') {
            indexContent = `${content.trim()} [File: ${fileName || 'Unknown'}, Type: ${fileType || 'Unknown'}]`;
          }
          
          // Store embedding asynchronously
          storeMessageEmbedding(
            (message._id as any).toString(),
            indexContent,
            {
              channelId: channelId,
              channelName: channel.name,
              userId: userId,
              userName: user.username,
              timestamp: new Date(),
              workspaceId: workspaceId.toString(),
              messageType: messageType, // Include message type in metadata
              fileName: fileName || null,
              fileType: fileType || null
            }
          ).catch((error: any) => {
            console.error('Failed to store message embedding:', error);
          });
        }
      } catch (error) {
        console.error('Error storing message embedding:', error);
        // Don't fail the message sending if embedding storage fails
      }
    }

    // Populate the message for response
    const populatedMessage = await Message.findById(message._id)
      .populate('author', 'username profession avatar')
      .populate('threadId', 'content author')
      .lean();

    console.log(`🚀 Broadcasting message to ${otherUserId ? 'DM' : 'channel'} ${actualChannelId}:`, populatedMessage);

    // Broadcast the message to all users in the channel/DM
    socketManager.emitToChannel(actualChannelId, 'message_received', populatedMessage);

    console.log(`✅ Message broadcast completed`);

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const editMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!content || content.trim() === '') {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only author can edit their message
    if (message.author.toString() !== userId) {
      res.status(403).json({ error: 'You can only edit your own messages' });
      return;
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('author', 'username profession avatar')
      .populate('threadId', 'content author')
      .lean();

    res.json({ message: populatedMessage });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only author can delete their message
    if (message.author.toString() !== userId) {
      res.status(403).json({ error: 'You can only delete your own messages' });
      return;
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Pin/unpin message functionality
export const togglePinMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const message = await Message.findById(messageId).populate('author', 'username');
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Check if user has permission to pin/unpin in this channel
    if (typeof message.channel === 'string' && message.channel.startsWith('dm-')) {
      // For DMs, allow either participant to pin
      const dmParts = message.channel.replace('dm-', '').split('-');
      if (!dmParts.includes(userId)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else {
      // For channels, check workspace membership
      const channel = await Channel.findById(message.channel).populate('workspace');
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }

      const workspace = await Workspace.findById(channel.workspace);
      if (!workspace || !workspace.members.some(member => member.toString() === userId)) {
        res.status(403).json({ error: 'Access denied to this workspace' });
        return;
      }
    }

    // Toggle pin status
    message.isPinned = !message.isPinned;
    message.pinnedBy = message.isPinned ? userId as any : undefined;
    message.pinnedAt = message.isPinned ? new Date() : undefined;

    await message.save();

    // If pinning, index for AI search
    if (message.isPinned) {
      try {
        // Skipping embedding for now to fix compile error
      } catch (embeddingError) {
        console.error('Failed to index pinned message for AI search:', embeddingError);
        // Don't fail the pin operation if indexing fails
      }
    }

    const populatedMessage = await Message.findById(messageId)
      .populate('author', 'username profession avatar')
      .populate('pinnedBy', 'username');

    // Emit to channel/DM
    const channelId = typeof message.channel === 'string' ? message.channel : message.channel.toString();
    socketManager.emitToChannel(channelId, 'message_pinned', {
      messageId,
      isPinned: message.isPinned,
      pinnedBy: message.pinnedBy,
      pinnedAt: message.pinnedAt
    });

    res.json({ 
      message: populatedMessage,
      action: message.isPinned ? 'pinned' : 'unpinned'
    });
  } catch (error) {
    console.error('Toggle pin message error:', error);
    res.status(500).json({ error: 'Failed to toggle pin message' });
  }
};

export const getPinnedMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if it's a DM or channel
    if (channelId.startsWith('dm-')) {
      // For DMs, verify user is part of the conversation
      const dmParts = channelId.replace('dm-', '').split('-');
      if (!dmParts.includes(userId)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else {
      // For channels, check workspace membership
      const channel = await Channel.findById(channelId).populate('workspace');
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }

      const workspace = await Workspace.findById(channel.workspace);
      if (!workspace || !workspace.members.some(member => member.toString() === userId)) {
        res.status(403).json({ error: 'Access denied to this workspace' });
        return;
      }
    }

    const pinnedMessages = await Message.find({ 
      channel: channelId,
      isPinned: true 
    })
      .populate('author', 'username profession avatar')
      .populate('pinnedBy', 'username')
      .sort({ pinnedAt: -1 });

    res.json({ messages: pinnedMessages });
  } catch (error) {
    console.error('Get pinned messages error:', error);
    res.status(500).json({ error: 'Failed to fetch pinned messages' });
  }
};

// DM Message Functions
const generateDMChannelId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `dm-${sortedIds[0]}-${sortedIds[1]}`;
};

export const getDMMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Generate DM channel ID
    const dmChannelId = generateDMChannelId(userId, otherUserId);

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({ channel: dmChannelId })
      .populate('author', 'username profession avatar')
      .populate('replyTo', 'content author')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .lean();

    const reversedMessages = messages.reverse();

    res.json({
      messages: reversedMessages,
      page: pageNum,
      limit: limitNum,
      total: await Message.countDocuments({ channel: dmChannelId })
    });
  } catch (error) {
    console.error('Get DM messages error:', error);
    res.status(500).json({ error: 'Failed to fetch DM messages' });
  }
};

export const sendDMMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { otherUserId } = req.params;
    const { 
      content, 
      messageType = 'text',
      fileUrl,
      fileName,
      fileSize,
      fileType,
      replyTo,
      threadId
    } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!content && !fileUrl) {
      res.status(400).json({ error: 'Message content or file is required' });
      return;
    }

    // Generate DM channel ID
    const dmChannelId = generateDMChannelId(userId, otherUserId);

    // Create message
    const messageData: any = {
      content: content?.trim() || '',
      author: userId,
      channel: dmChannelId,
      messageType,
      isEdited: false
    };

    // Add file data if present
    if (fileUrl) {
      messageData.fileUrl = fileUrl;
      messageData.fileName = fileName;
      messageData.fileSize = fileSize;
      messageData.fileType = fileType;
    }

    // Add reply reference if present
    if (replyTo || threadId) {
      messageData.replyTo = replyTo || threadId;
      messageData.threadId = threadId || replyTo;
    }

    const message = new Message(messageData);
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('author', 'username profession avatar')
      .populate('replyTo', 'content author')
      .lean();

    console.log(`🚀 Broadcasting DM message to channel ${dmChannelId}:`, populatedMessage);

    // Emit to both users in the DM
    socketManager.emitToChannel(dmChannelId, 'message_received', populatedMessage);

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Send DM message error:', error);
    res.status(500).json({ error: 'Failed to send DM message' });
  }
};
