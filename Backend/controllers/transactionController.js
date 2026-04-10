import { supabase } from '../utils/supabase.js';

export const issueBook = async (req, res) => {
    const { book_id } = req.body;
    const userId = req.user.id;

    if (!book_id) return res.status(400).json({ error: "book_id is required" });

    // 1. Check availability
    const { data: book, error: bookError } = await supabase.from('books').select('*').eq('id', book_id).single();
    
    if (bookError || !book) return res.status(404).json({ error: "Book not found" });
    if (book.available_quantity <= 0) return res.status(400).json({ error: "Book out of stock" });

    // 2. Insert transaction
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 day return policy

    const { data: transaction, error: txnError } = await supabase.from('transactions').insert([{
        user_id: userId,
        book_id: book_id,
        due_date: dueDate,
        status: 'issued'
    }]).select().single();

    if (txnError) return res.status(500).json({ error: txnError.message });

    // 3. Decrement available_quantity
    const { error: updateError } = await supabase.from('books').update({ 
        available_quantity: book.available_quantity - 1 
    }).eq('id', book_id);

    if (updateError) return res.status(500).json({ error: "Failed to update internal quantities" });

    res.status(201).json({ message: "Book issued successfully", transaction });
};

export const returnBook = async (req, res) => {
    const { transaction_id } = req.body;
    const userId = req.user.id;

    if (!transaction_id) return res.status(400).json({ error: "transaction_id is required" });

    // Get the transaction to ensure it's issued and belongs to user
    const { data: transaction, error: getError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transaction_id)
        .eq('user_id', userId)
        .single();
    
    if (getError || !transaction || transaction.status !== 'issued') {
        return res.status(400).json({ error: "Invalid transaction or already returned" });
    }

    const returnDate = new Date();
    const dueDate = new Date(transaction.due_date);
    let fine = 0;

    // Check if late (₹5 per day after due date)
    if (returnDate > dueDate) {
        const diffTime = Math.abs(returnDate - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        fine = diffDays * 5;
    }

    // Update Transaction
    const { data: updatedTxn, error: updateError } = await supabase
        .from('transactions')
        .update({
            status: 'returned',
            return_date: returnDate,
            fine_amount: fine
        })
        .eq('id', transaction_id)
        .select()
        .single();

    if (updateError) return res.status(500).json({ error: updateError.message });

    // Increment available_quantity
    const { data: book } = await supabase.from('books').select('available_quantity').eq('id', transaction.book_id).single();
    if (book) {
        await supabase.from('books').update({ 
            available_quantity: book.available_quantity + 1 
        }).eq('id', transaction.book_id);
    }

    res.json({ message: "Book returned successfully", fine, transaction: updatedTxn });
};

export const getHistory = async (req, res) => {
    // If admin, can provide a user_id query param to check others. Normal user checks self.
    const { user_id } = req.query;
    
    // Quick role check:
    const { data: userData } = await supabase.from('users').select('role').eq('id', req.user.id).single();
    
    let queryId = req.user.id;
    if (userData?.role === 'admin' && user_id) {
        queryId = user_id;
    }

    const { data: history, error } = await supabase
        .from('transactions')
        .select('*, books(title, author)')
        .eq('user_id', queryId)
        .order('issue_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(history);
};
