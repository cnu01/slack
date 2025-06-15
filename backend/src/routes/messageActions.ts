import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  addReaction,
  removeReaction,
  createThreadReply,
  getThreadReplies,
  pinMessage,
  unpinMessage,
  getPinnedMessages
} from '../controllers/messageActionsController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// REACTION ROUTES
// @route   POST /api/message-actions/:messageId/reactions
// @desc    Add reaction to a message
// @access  Private
router.post('/:messageId/reactions', addReaction);

// @route   DELETE /api/message-actions/:messageId/reactions
// @desc    Remove reaction from a message
// @access  Private
router.delete('/:messageId/reactions', removeReaction);

// THREAD ROUTES
// @route   POST /api/message-actions/:messageId/replies
// @desc    Create a thread reply to a message
// @access  Private
router.post('/:messageId/replies', createThreadReply);

// @route   GET /api/message-actions/:messageId/replies
// @desc    Get thread replies for a message
// @access  Private
router.get('/:messageId/replies', getThreadReplies);

// PIN ROUTES
// @route   POST /api/message-actions/:messageId/pin
// @desc    Pin a message
// @access  Private
router.post('/:messageId/pin', pinMessage);

// @route   DELETE /api/message-actions/:messageId/pin
// @desc    Unpin a message
// @access  Private
router.delete('/:messageId/pin', unpinMessage);

// @route   GET /api/message-actions/channels/:channelId/pinned
// @desc    Get pinned messages for a channel
// @access  Private
router.get('/channels/:channelId/pinned', getPinnedMessages);

export default router;
