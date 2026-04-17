import { supabase } from '../utils/supabase.js';


export const getMe = async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, created_at')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        return res.json({ user });
    } catch (err) {
        console.error('getMe error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
