import { Response } from 'express';
import Channel from '../models/Channel';
import Workspace from '../models/Workspace';
import { AuthRequest } from '../middleware/auth';

export const getChannels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user is a member of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.members.some(member => member.toString() === userId)) {
      res.status(403).json({ error: 'Access denied to this workspace' });
      return;
    }

    // Get all channels user has access to
    const channels = await Channel.find({
      workspace: workspaceId,
      $or: [
        { isPrivate: false },
        { members: userId }
      ]
    })
    .populate('createdBy', 'username')
    .select('name description isPrivate members createdBy createdAt')
    .sort({ name: 1 });

    const channelsWithMemberInfo = channels.map(channel => ({
      _id: channel._id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.isPrivate,
      memberCount: channel.members.length,
      isMember: channel.members.some(member => member.toString() === userId),
      createdBy: channel.createdBy,
      createdAt: channel.createdAt
    }));

    res.json({ channels: channelsWithMemberInfo });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
};

export const createChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { name, description, isPrivate = false } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate input
    if (!name || name.trim().length < 1) {
      res.status(400).json({ error: 'Channel name is required' });
      return;
    }

    // Check if user is a member of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.members.some(member => member.toString() === userId)) {
      res.status(403).json({ error: 'Access denied to this workspace' });
      return;
    }

    // Create channel
    const channel = new Channel({
      name: name.trim().toLowerCase(),
      description: description?.trim(),
      workspace: workspaceId,
      isPrivate,
      members: [userId], // Creator automatically becomes a member
      createdBy: userId
    });

    await channel.save();
    await channel.populate('createdBy', 'username');

    res.status(201).json({
      message: 'Channel created successfully',
      channel: {
        _id: channel._id,
        name: channel.name,
        description: channel.description,
        isPrivate: channel.isPrivate,
        memberCount: channel.members.length,
        isMember: true,
        createdBy: channel.createdBy,
        createdAt: channel.createdAt
      }
    });
  } catch (error: any) {
    console.error('Create channel error:', error);
    
    if (error.code === 11000) {
      res.status(400).json({ error: 'A channel with this name already exists in the workspace' });
      return;
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ error: errors.join(', ') });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, channelId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user is a member of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.members.some(member => member.toString() === userId)) {
      res.status(403).json({ error: 'Access denied to this workspace' });
      return;
    }

    const channel = await Channel.findOne({ _id: channelId, workspace: workspaceId });
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (channel.isPrivate) {
      res.status(403).json({ error: 'Cannot join private channel without invitation' });
      return;
    }

    if (channel.members.some(member => member.toString() === userId)) {
      res.status(400).json({ error: 'You are already a member of this channel' });
      return;
    }

    // Add user to channel
    await Channel.findByIdAndUpdate(channelId, {
      $addToSet: { members: userId }
    });

    res.json({ message: 'Successfully joined channel' });
  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
