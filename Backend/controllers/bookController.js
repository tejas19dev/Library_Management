import { supabase } from '../utils/supabase.js';

// Get paginated books
export const getBooks = async (req, res) => {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data: books, error, count } = await supabase
        .from('books')
        .select('*', { count: 'exact' })
        .range(start, end);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
        data: books,
        meta: {
            page,
            limit,
            totalItems: count,
            totalPages: Math.ceil(count / limit)
        }
    });
};

// Search book by title, author, category
export const searchBooks = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Search query 'q' is required" });

    const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .or(`title.ilike.%${q}%,author.ilike.%${q}%,category.ilike.%${q}%`);

    if (error) return res.status(500).json({ error: error.message });

    res.json(books);
};

// Add Book (Admin Only)
export const addBook = async (req, res) => {
    const { title, author, category, isbn, quantity } = req.body;
    
    // simple validation
    if (!title || !author || !isbn) {
        return res.status(400).json({ error: "Title, author, and isbn are required." });
    }

    const { data: book, error } = await supabase
        .from('books')
        .insert([{
            title, author, category, isbn, 
            quantity: quantity || 1, 
            available_quantity: quantity || 1
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(book);
};

// Update Book (Admin Only)
export const updateBook = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const { data: book, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(book);
};

// Delete Book (Admin Only)
export const deleteBook = async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Book deleted successfully" });
};
