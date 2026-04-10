import { supabase } from '../utils/supabase.js';

export const getStats = async (req, res) => {
    try {
        // 1. Total books
        const { count: booksCount } = await supabase.from('books').select('*', { count: 'exact', head: true });
        
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
