import express from 'express';
import { getStats } from '../controllers/adminController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Admin stats: Requires JWT + Admin Role
router.get('/stats', verifyJWT, requireAdmin, getStats);

export default router;
