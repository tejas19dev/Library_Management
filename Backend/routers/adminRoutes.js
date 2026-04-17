import express from 'express';
import { getStats, getUsers } from '../controllers/adminController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/stats', verifyJWT, requireAdmin, getStats);
router.get('/users', verifyJWT, requireAdmin, getUsers);

export default router;
