import { supabase } from '../utils/supabase.js';

export const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        // Fetch user from out public mapped 'users' table
        const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (error || !userData) {
            return res.status(500).json({ error: "Failed to fetch user role" });
        }

        if (userData.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required for this action" });
        }

        next();
    } catch (err) {
        console.error("Role Middleware Error:", err);
        return res.status(500).json({ error: "Internal Server Error checking role" });
    }
};
