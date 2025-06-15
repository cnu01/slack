import { Router } from 'express';
import { 
  getMessages, 
  sendMessage, 
  editMessage, 
  deleteMessage,
  getDMMessages,
  sendDMMessage
} from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// @route   GET /api/messages/channel/:channelId
// @desc    Get messages in a channel
// @access  Private (channel members only)
router.get('/channel/:channelId', getMessages);

// @route   POST /api/messages/channel/:channelId
// @desc    Send a message to a channel
// @access  Private (channel members only)
router.post('/channel/:channelId', sendMessage);

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private (message author only)
router.put('/:messageId', editMessage);

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private (message author only)
router.delete('/:messageId', deleteMessage);

// @route   GET /api/messages/dm/:otherUserId
// @desc    Get direct messages with another user
// @access  Private
router.get('/dm/:otherUserId', getDMMessages);

// @route   POST /api/messages/dm/:otherUserId
// @desc    Send a direct message to another user
// @access  Private
router.post('/dm/:otherUserId', sendDMMessage);

export default router;
