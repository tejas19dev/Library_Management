import express from 'express';
import { issueBook, returnBook, getHistory } from '../controllers/transactionController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/issue', verifyJWT, issueBook);
router.post('/return', verifyJWT, returnBook);
router.get('/history', verifyJWT, getHistory);

export default router;
