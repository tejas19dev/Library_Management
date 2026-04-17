import { supabase } from '../utils/supabase.js';

export const getStats = async (req, res) => {
    try {
        // 1. Total books
        const { count: booksCount } = await supabase.from('book_info').select('*', { count: 'exact', head: true });
        
        // 2. Total users
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        // 3. Issued books count
        const { count: issuedCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'issued');
        
        // 4. Overdue books count
        const now = new Date().toISOString();
        const { count: overdueCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'issued')
            .lt('due_date', now);

        res.json({
            stats: {
                totalBooks: booksCount || 0,
                totalUsers: usersCount || 0,
                issuedBooks: issuedCount || 0,
                overdueBooks: overdueCount || 0
            }
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
};

// GET /api/users — list all users (admin only)
export const getUsers = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, created_at')
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        res.json({ users });
    } catch (err) {
        console.error('getUsers error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
