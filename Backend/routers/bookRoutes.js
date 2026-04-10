import express from 'express';
import { getBooks, searchBooks, addBook, updateBook, deleteBook } from '../controllers/bookController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', getBooks);             // Public or can add verifyJWT if needed
router.get('/search', searchBooks);    // Public

// Protected Admin Routes
router.post('/', verifyJWT, requireAdmin, addBook);
router.put('/:id', verifyJWT, requireAdmin, updateBook);
router.delete('/:id', verifyJWT, requireAdmin, deleteBook);

export default router;
