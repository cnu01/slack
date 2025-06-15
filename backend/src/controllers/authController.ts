import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Workspace from '../models/Workspace';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username, profession } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Create new user
    const user = new User({
      email,
      password,
      username,
      profession
    });

    await user.save();

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return user data (excluding password)
    const userData = {
      _id: user._id,
      email: user.email,
      username: user.username,
      profession: user.profession,
      avatar: user.avatar,
      workspaces: user.workspaces,
      isOnline: user.isOnline,
      createdAt: user.createdAt
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userData,
      token,
      refreshToken
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ error: errors.join(', ') });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).populate('workspaces');
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Update user online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return user data (excluding password)
    const userData = {
      _id: user._id,
      email: user.email,
      username: user.username,
      profession: user.profession,
      avatar: user.avatar,
      workspaces: user.workspaces,
      isOnline: user.isOnline,
      createdAt: user.createdAt
    };

    res.json({
      message: 'Login successful',
      user: userData,
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (userId) {
      // Update user offline status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date()
      });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = {
      _id: user._id,
      email: user.email,
      username: user.username,
      profession: user.profession,
      avatar: user.avatar,
      workspaces: user.workspaces,
      isOnline: user.isOnline,
      createdAt: user.createdAt
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { avatarUrl } = req.body;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!avatarUrl || typeof avatarUrl !== 'string') {
      res.status(400).json({ error: 'Avatar URL is required' });
      return;
    }

    // Validate URL format (basic validation)
    try {
      new URL(avatarUrl);
    } catch {
      res.status(400).json({ error: 'Invalid avatar URL format' });
      return;
    }

    // Update user's avatar
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = {
      _id: user._id,
      email: user.email,
      username: user.username,
      profession: user.profession,
      avatar: user.avatar,
      workspaces: user.workspaces,
      isOnline: user.isOnline,
      createdAt: user.createdAt
    };

    res.json({ 
      message: 'Avatar updated successfully', 
      user: userData 
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Internal server error while updating avatar' });
  }
};
