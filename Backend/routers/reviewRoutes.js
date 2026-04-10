import express from 'express';
import { addReview, getReviews } from '../controllers/reviewController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyJWT, addReview);
router.get('/:bookId', getReviews); // Public

export default router;
