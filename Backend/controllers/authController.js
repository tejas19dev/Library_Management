import { supabase } from '../utils/supabase.js';

// Signup logic
export const signup = async (req, res) => {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError || !authData.user) {
            return res.status(400).json({ error: authError?.message || "Error creating user" });
        }

        // Create user profile in public.users table
        const { error: dbError } = await supabase
            .from('users')
            .insert([{
                id: authData.user.id,
                email: email,
                full_name: full_name,
                role: role === 'admin' ? 'admin' : 'user' 
            }]);

        if (dbError) {
            console.error("Profile Creation error:", dbError);
            return res.status(500).json({ error: "Successfully authenticated, but failed to create profile" });
        }

        return res.status(201).json({ message: "User registered successfully", user: authData.user });
    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// Login logic
export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.session) {
            return res.status(401).json({ error: error?.message || "Invalid credentials" });
        }

        // Return JWT
        return res.status(200).json({
            message: "Login successful",
            token: data.session.access_token,
            user: data.user
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
