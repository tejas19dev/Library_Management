import { supabase } from '../utils/supabase.js';

export const addReview = async (req, res) => {
    const { book_id, rating, review_text } = req.body;
    const userId = req.user.id;

    if (!book_id || !rating) return res.status(400).json({ error: "book_id and rating (1-5) are required" });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });

    // Ensure the book exists
    const { data: book, error: bookError } = await supabase.from('book_info').select('id').eq('id', book_id).single();
    if (bookError || !book) return res.status(404).json({ error: "Book not found" });

    const { data: review, error } = await supabase.from('reviews').insert([{
        user_id: userId,
        book_id: book_id,
        rating,
        review_text
    }]).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Review added", review });
};

export const getReviews = async (req, res) => {
    const { bookId } = req.params;

    const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*, users(full_name)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(reviews);
};
