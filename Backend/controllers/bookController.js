import { supabase } from '../utils/supabase.js';

// ── GET all books (paginated) ───────────────────────────────────
export const getBooks = async (req, res) => {
    let { page = 1, limit = 20 } = req.query;
    page  = parseInt(page);
    limit = parseInt(limit);

    const start = (page - 1) * limit;
    const end   = start + limit - 1;

    const { data: books, error, count } = await supabase
        .from('book_info')
        .select('*', { count: 'exact' })
        .range(start, end);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
        data: books,
        meta: {
            page,
            limit,
            totalItems:  count,
            totalPages:  Math.ceil(count / limit)
        }
    });
};

// ── SEARCH books by title / author / category ──────────────────
export const searchBooks = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Search query 'q' is required" });

    const { data: books, error } = await supabase
        .from('book_info')
        .select('*')
        .or(`title.ilike.%${q}%,author.ilike.%${q}%,category.ilike.%${q}%`);

    if (error) return res.status(500).json({ error: error.message });
    res.json(books);
};

// ── GET single book by ID ──────────────────────────────────────
export const getBookById = async (req, res) => {
    const { id } = req.params;

    const { data: book, error } = await supabase
        .from('book_info')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
};

// ── ADD book (Admin) ───────────────────────────────────────────
export const addBook = async (req, res) => {
    const {
        title, author, publisher, category,
        permission, paperback, ebook, language,
        isbn10, isbn13, cover_image_url,
        description, source_url, price_inr
    } = req.body;

    if (!title || !author) {
        return res.status(400).json({ error: "title and author are required." });
    }

    const { data: book, error } = await supabase
        .from('book_info')
        .insert([{
            title, author, publisher, category,
            permission, paperback, ebook, language,
            isbn10, isbn13, cover_image_url,
            description, source_url,
            price_inr: price_inr || 0
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(book);
};

// ── UPDATE book (Admin) ────────────────────────────────────────
export const updateBook = async (req, res) => {
    const { id }    = req.params;
    const updates   = req.body;

    const { data: book, error } = await supabase
        .from('book_info')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(book);
};

// ── DELETE book (Admin) ────────────────────────────────────────
export const deleteBook = async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('book_info')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Book deleted successfully" });
};
