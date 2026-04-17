import express from 'express';
import { signup, login } from '../controllers/authController.js';
import { getMe } from '../controllers/meController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', verifyJWT, getMe);  // GET logged-in user's profile

export default router;
