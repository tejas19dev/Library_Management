import { supabase } from '../utils/supabase.js';

export const verifyJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: "No authentication token provided" });
        }

        // Validate token with Supabase Auth
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        
        // Attach the user to the request object so subsequent handlers can access it
        req.user = user;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        return res.status(500).json({ error: "Internal Server Error in Authentication" });
    }
};
