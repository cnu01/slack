import { Response } from 'express';
import Message from '../models/Message';
import Channel from '../models/Channel';
import Workspace from '../models/Workspace';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { socketManager } from '../app';
import { storeMessageEmbedding } from './aiController';

// Note: Socket events will be added later when integrating with real-time features

// REACTION CONTROLLERS
export const addReaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!emoji || typeof emoji !== 'string') {
      res.status(400).json({ error: 'Emoji is required' });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Check if user has access to the channel
    // For DM channels (string format), skip channel validation as DMs are virtual
    if (typeof message.channel === 'object' || !message.channel.toString().startsWith('dm-')) {
      const channel = await Channel.findById(message.channel);
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }
    }

    // Find existing reaction with this emoji
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (existingReaction) {
      // Check if user already reacted with this emoji
      const userAlreadyReacted = existingReaction.users.some(userId => userId.toString() === req.user?.userId);
      
      if (userAlreadyReacted) {
        res.status(400).json({ error: 'User already reacted with this emoji' });
        return;
      }
      
      // Add user to existing reaction
      existingReaction.users.push(userId as any);
    } else {
      // Create new reaction
      message.reactions.push({
        emoji,
        users: [userId as any]
      });
    }

    await message.save();

    // TODO: Emit real-time update when socket integration is added
    // socketManager.emitToChannel(message.channel.toString(), 'reaction_added', {
    //   messageId: message._id,
    //   emoji,
    //   userId,
    //   reactions: message.reactions
    // });

    res.json({ 
      message: 'Reaction added successfully',
      reactions: message.reactions 
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeReaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
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

    // Find the reaction
    const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);
    if (reactionIndex === -1) {
      res.status(404).json({ error: 'Reaction not found' });
      return;
    }

    const reaction = message.reactions[reactionIndex];
    
    // Remove user from reaction
    reaction.users = reaction.users.filter(id => id.toString() !== userId);
    
    // If no users left, remove the entire reaction
    if (reaction.users.length === 0) {
      message.reactions.splice(reactionIndex, 1);
    }

    await message.save();

    // TODO: Emit real-time update when socket integration is added
    // socketManager.emitToChannel(message.channel.toString(), 'reaction_removed', {
    //   messageId: message._id,
    //   emoji,
    //   userId,
    //   reactions: message.reactions
    // });

    res.json({ 
      message: 'Reaction removed successfully',
      reactions: message.reactions 
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// THREAD CONTROLLERS
export const createThreadReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    // Find the parent message
    const parentMessage = await Message.findById(messageId);
    if (!parentMessage) {
      res.status(404).json({ error: 'Parent message not found' });
      return;
    }

    // Create thread reply
    const threadReply = new Message({
      content: content.trim(),
      author: userId,
      channel: parentMessage.channel,
      workspace: parentMessage.workspace,
      threadId: parentMessage._id,
      messageType: 'text'
    });

    await threadReply.save();

    // Update parent message thread info
    if (!parentMessage.threadReplies) {
      parentMessage.threadReplies = [];
    }
    parentMessage.threadReplies.push(threadReply._id as mongoose.Types.ObjectId);
    parentMessage.threadReplyCount = (parentMessage.threadReplyCount || 0) + 1;
    parentMessage.lastThreadReply = new Date();
    
    await parentMessage.save();

    // Populate the reply with author info
    await threadReply.populate('author', 'username email avatar');

    // TODO: Emit real-time updates when socket integration is added
    // socketManager.emitToChannel(parentMessage.channel.toString(), 'thread_reply_created', {
    //   parentMessageId: parentMessage._id,
    //   reply: threadReply,
    //   threadReplyCount: parentMessage.threadReplyCount
    // });

    res.status(201).json({
      message: 'Thread reply created successfully',
      reply: threadReply,
      threadReplyCount: parentMessage.threadReplyCount
    });
  } catch (error) {
    console.error('Create thread reply error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getThreadReplies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify parent message exists
    const parentMessage = await Message.findById(messageId);
    if (!parentMessage) {
      res.status(404).json({ error: 'Parent message not found' });
      return;
    }

    // Get thread replies
    const replies = await Message.find({ threadId: messageId })
      .populate('author', 'username email avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const totalReplies = await Message.countDocuments({ threadId: messageId });
    const totalPages = Math.ceil(totalReplies / limit);

    res.json({
      replies,
      pagination: {
        page,
        limit,
        totalReplies,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Get thread replies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PIN CONTROLLERS
export const pinMessage = async (req: AuthRequest, res: Response): Promise<void> => {
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

    if (message.isPinned) {
      res.status(400).json({ error: 'Message is already pinned' });
      return;
    }

    // Check if user has permission to pin (could add role-based permissions later)
    // For DM channels (string format), skip channel validation as DMs are virtual
    if (typeof message.channel === 'object' || !message.channel.toString().startsWith('dm-')) {
      const channel = await Channel.findById(message.channel).populate('workspace');
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
    } else {
      // For DMs, verify user is part of the conversation
      const dmParts = message.channel.toString().replace('dm-', '').split('-');
      if (!dmParts.includes(userId)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    message.isPinned = true;
    message.pinnedBy = userId as any;
    message.pinnedAt = new Date();

    await message.save();

    // Index pinned message for AI search
    try {
      // await storeMessageEmbedding(message); // TODO: Fix embedding call
    } catch (embeddingError) {
      console.error('Failed to index pinned message for AI search:', embeddingError);
      // Don't fail the pin operation if indexing fails
    }

    // Emit real-time update
    socketManager.emitToChannel(message.channel.toString(), 'message_pinned', {
      messageId: message._id,
      isPinned: true,
      pinnedBy: userId,
      pinnedAt: message.pinnedAt
    });

    res.json({ 
      message: 'Message pinned successfully',
      pinnedAt: message.pinnedAt
    });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unpinMessage = async (req: AuthRequest, res: Response): Promise<void> => {
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

    if (!message.isPinned) {
      res.status(400).json({ error: 'Message is not pinned' });
      return;
    }

    // Check if user has permission to unpin
    if (typeof message.channel === 'object' || !message.channel.toString().startsWith('dm-')) {
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
    } else {
      // For DMs, verify user is part of the conversation
      const dmParts = message.channel.toString().replace('dm-', '').split('-');
      if (!dmParts.includes(userId)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    message.isPinned = false;
    message.pinnedBy = undefined;
    message.pinnedAt = undefined;

    await message.save();

    // Emit real-time update
    socketManager.emitToChannel(message.channel.toString(), 'message_unpinned', {
      messageId: message._id,
      isPinned: false,
      unpinnedBy: userId
    });

    res.json({ message: 'Message unpinned successfully' });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    // Verify channel access and permissions
    if (!channelId.startsWith('dm-')) {
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
    } else {
      // For DMs, verify user is part of the conversation
      const dmParts = channelId.replace('dm-', '').split('-');
      if (!dmParts.includes(userId)) {
        res.status(403).json({ error: 'Access denied' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
};
