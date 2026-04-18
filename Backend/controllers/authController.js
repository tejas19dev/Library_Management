import { supabase, supabaseAdmin } from '../utils/supabase.js';

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

        // Create user profile using admin client (bypasses RLS INSERT restriction)
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .insert([{
                id: authData.user.id,
                email: email,
                full_name: full_name,
                role: role === 'admin' ? 'admin' : 'user'
            }]);

        if (dbError) {
            console.error('Profile Creation error:', dbError);
            // Don't block — user was created in Auth, profile can be retried
            return res.status(201).json({ 
                message: "User registered. Profile setup incomplete — contact admin.",
                user: authData.user,
                warning: dbError.message 
            });
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
            // Check for specific error types
            if (error?.message?.includes('Email not confirmed')) {
                return res.status(401).json({ 
                    error: "Please confirm your email first. Check your inbox for the verification link.",
                    code: "EMAIL_NOT_CONFIRMED"
                });
            }
            return res.status(401).json({ error: error?.message || "Invalid credentials" });
        }

        // Get user role from users table
        const { data: userData } = await supabase
            .from('users')
            .select('role, full_name')
            .eq('id', data.user.id)
            .single();

        const role = userData?.role || 'user';

        // Return JWT
        return res.status(200).json({
            message: "Login successful",
            token: data.session.access_token,
            user: { ...data.user, role }
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
