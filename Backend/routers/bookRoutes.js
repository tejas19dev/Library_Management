import express from 'express';
import { getBooks, searchBooks, getBookById, addBook, updateBook, deleteBook } from '../controllers/bookController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public routes
router.get('/',        getBooks);       // GET /api/books?page=1&limit=20
router.get('/search',  searchBooks);    // GET /api/books/search?q=python
router.get('/:id',     getBookById);    // GET /api/books/42

// Protected Admin Routes
router.post('/',       verifyJWT, requireAdmin, addBook);
router.put('/:id',     verifyJWT, requireAdmin, updateBook);
router.delete('/:id',  verifyJWT, requireAdmin, deleteBook);

export default router;

