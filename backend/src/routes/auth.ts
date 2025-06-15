import { Router } from 'express';
import { register, login, logout, getProfile, updateAvatar } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateToken, logout);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, getProfile);

// @route   PUT /api/auth/avatar
// @desc    Update user avatar
// @access  Private
router.put('/avatar', authenticateToken, updateAvatar);

export default router;
