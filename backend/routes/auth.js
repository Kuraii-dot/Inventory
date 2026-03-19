// backend/routes/auth.js

import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login   — converted from index.php POST handler
router.post('/login', login);

// POST /api/auth/logout  — converted from logout.php
router.post('/logout', authenticate, logout);

// GET  /api/auth/me      — returns current user (for React rehydration)
router.get('/me', authenticate, me);

export default router;