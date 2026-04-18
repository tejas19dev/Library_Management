import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { supabaseAdmin } from '../utils/supabase.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session
router.post('/create-checkout-session', verifyJWT, async (req, res) => {
    try {
        const { amount, description, bookTitle } = req.body;
        
        // Validate amount (minimum ₹10 = 1000 paise)
        if (!amount || amount < 10) {
            return res.status(400).json({ error: 'Minimum amount is ₹10' });
        }

        // Convert amount to paise (Stripe uses smallest currency unit)
        const amountInPaise = Math.round(amount * 100);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'upi'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: description || 'DevLibrary Purchase',
                            description: bookTitle ? `Book: ${bookTitle}` : 'Library payment',
                        },
                        unit_amount: amountInPaise,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/payment.html`,
            metadata: {
                userId: req.user.id,
                bookTitle: bookTitle || '',
                description: description || '',
            },
        });

        // Store pending payment in Supabase
        const { data: payment, error } = await supabaseAdmin
            .from('payments')
            .insert([{
                user_id: req.user.id,
                amount: amount,
                status: 'pending',
                stripe_session_id: session.id,
                description: description || 'Book purchase',
            }])
            .select()
            .single();

        if (error) {
            console.error('Payment record error:', error);
        }

        res.json({ 
            sessionId: session.id, 
            url: session.url 
        });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify payment status
router.get('/verify/:sessionId', verifyJWT, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            // Update payment status in Supabase
            await supabaseAdmin
                .from('payments')
                .update({ 
                    status: 'completed',
                    stripe_payment_intent: session.payment_intent
                })
                .eq('stripe_session_id', sessionId);

            res.json({ 
                success: true, 
                paymentStatus: 'paid',
                amount: session.amount_total / 100 
            });
        } else {
            res.json({ 
                success: false, 
                paymentStatus: 'unpaid' 
            });
        }
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get payment history
router.get('/history', verifyJWT, async (req, res) => {
    try {
        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ payments });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;