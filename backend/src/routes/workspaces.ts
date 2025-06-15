import { Router } from 'express';
import { getAllWorkspaces, createWorkspace, joinWorkspace, getWorkspaceDetails, getWorkspaceUsers } from '../controllers/workspaceController';

const router = Router();

// @route   GET /api/workspaces
// @desc    Get all public workspaces with user membership status
// @access  Private
router.get('/', getAllWorkspaces);

// @route   POST /api/workspaces
// @desc    Create a new workspace
// @access  Private
router.post('/', createWorkspace);

// @route   GET /api/workspaces/:workspaceId
// @desc    Get workspace details
// @access  Private (members only)
router.get('/:workspaceId', getWorkspaceDetails);

// @route   POST /api/workspaces/:workspaceId/join
// @desc    Join a workspace
// @access  Private
router.post('/:workspaceId/join', joinWorkspace);

// @route   GET /api/workspaces/:workspaceId/users
// @desc    Get all users in a workspace
// @access  Private (members only)
router.get('/:workspaceId/users', getWorkspaceUsers);

export default router;
