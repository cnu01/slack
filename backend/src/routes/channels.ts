import { Router } from 'express';
import { getChannels, createChannel, joinChannel } from '../controllers/channelController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// @route   GET /api/workspaces/:workspaceId/channels
// @desc    Get all channels in a workspace
// @access  Private (workspace members only)
router.get('/:workspaceId/channels', getChannels);

// @route   POST /api/workspaces/:workspaceId/channels
// @desc    Create a new channel in a workspace
// @access  Private (workspace members only)
router.post('/:workspaceId/channels', createChannel);

// @route   POST /api/workspaces/:workspaceId/channels/:channelId/join
// @desc    Join a channel
// @access  Private (workspace members only)
router.post('/:workspaceId/channels/:channelId/join', joinChannel);

export default router;
