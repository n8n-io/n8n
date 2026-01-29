import { Router } from 'express';
import {
  register,
  getSalt,
  login,
  refreshToken,
  logout,
  getRecoveryBlob,
} from '../controllers/auth.controller.js';
import { authRateLimiter } from '../middleware/security.js';

const router = Router();

// Public routes (with stricter rate limiting)
router.post('/register', authRateLimiter, register);
router.post('/salt', authRateLimiter, getSalt);
router.post('/login', authRateLimiter, login);
router.post('/refresh', authRateLimiter, refreshToken);
router.post('/logout', logout);
router.post('/recovery-blob', authRateLimiter, getRecoveryBlob);

export default router;
