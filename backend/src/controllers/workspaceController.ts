import { Router } from 'express';
import { Request, Response } from 'express';
import Workspace, { IWorkspace } from '../models/Workspace';
import User from '../models/User';
import Channel from '../models/Channel';
import { AuthRequest } from '../middleware/auth';

export const getAllWorkspaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    
    // Get all public workspaces and user's joined workspaces
    const allWorkspaces = await Workspace.find({ isPublic: true })
      .populate('createdBy', 'username email')
      .select('name description isPublic members createdBy createdAt');

    // Add information about which workspaces user has joined
    const workspacesWithStatus = allWorkspaces.map(workspace => {
      const creator = workspace.createdBy as any; // Type assertion for populated field
      return {
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description,
        isPublic: workspace.isPublic,
        memberCount: workspace.members.length,
        isMember: workspace.members.some(member => member.toString() === userId),
        isOwner: creator._id.toString() === userId,
        owner: {
          _id: creator._id,
          username: creator.username
        },
        createdAt: workspace.createdAt
      };
    });

    res.json({ workspaces: workspacesWithStatus });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
};

export const createWorkspace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, isPublic = true } = req.body;
    const userId = (req as any).user?.userId;

    // Validate input
    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Workspace name must be at least 2 characters long' });
      return;
    }

    // Check if workspace with same name exists
    const existingWorkspace = await Workspace.findOne({ name: name.trim() });
    if (existingWorkspace) {
      res.status(400).json({ error: 'Workspace with this name already exists' });
      return;
    }

    // Create workspace
    const workspace = new Workspace({
      name: name.trim(),
      description: description?.trim(),
      createdBy: userId,
      members: [userId], // Creator automatically becomes a member
      isPublic
    });

    await workspace.save();

    // Create default "general" channel
    await Channel.createDefaultChannel(workspace._id as string, userId);

    // Add workspace to user's workspaces
    await User.findByIdAndUpdate(userId, {
      $addToSet: { workspaces: workspace._id }
    });

    // Populate creator info
    await workspace.populate('createdBy', 'username email');

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace
    });
  } catch (error: any) {
    console.error('Create workspace error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ error: errors.join(', ') });
      return;
    }
    
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

export const joinWorkspace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Check if it's a public workspace or user has permission
    if (!workspace.isPublic) {
      res.status(403).json({ error: 'This workspace is private' });
      return;
    }

    // Check if user is already a member
    const user = await User.findById(userId);
    const isAlreadyMember = user?.workspaces.some(ws => ws.toString() === workspaceId);
    if (isAlreadyMember) {
      res.status(400).json({ error: 'You are already a member of this workspace' });
      return;
    }

    // Add workspace to user's workspaces
    await User.findByIdAndUpdate(userId, {
      $addToSet: { workspaces: workspaceId }
    });

    // Add user to workspace members
    await Workspace.findByIdAndUpdate(workspaceId, {
      $addToSet: { members: userId }
    });

    res.json({
      message: 'Successfully joined workspace',
      workspaceId
    });
  } catch (error) {
    console.error('Join workspace error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWorkspaceDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).user?.userId;

    // Find workspace and populate related data
    const workspace = await Workspace.findById(workspaceId)
      .populate('createdBy', 'username email avatar')
      .populate('members', 'username email avatar isOnline lastSeen')
      .populate('channels', 'name displayName description type members');

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Check if user is a member
    if (!workspace.members.some((member: any) => member._id.toString() === userId)) {
      res.status(403).json({ error: 'You are not a member of this workspace' });
      return;
    }

    res.json({ workspace });
  } catch (error) {
    console.error('Get workspace details error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace details' });
  }
};

export const getWorkspaceUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Find workspace and check if user is a member
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Check if user is a member
    if (!workspace.members.some(member => member.toString() === userId)) {
      res.status(403).json({ error: 'You are not a member of this workspace' });
      return;
    }

    // Get all workspace users with their details
    const users = await User.find({ 
      _id: { $in: workspace.members } 
    })
    .select('username email profession avatar isOnline lastSeen')
    .lean();

    // Add online status based on your app's logic
    const usersWithStatus = users.map(user => ({
      ...user,
      status: user.isOnline ? 'online' : 'offline'
    }));

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Get workspace users error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace users' });
  }
};
