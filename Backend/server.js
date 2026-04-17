import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import { supabase } from "./utils/supabase.js";

import authRoutes from './routers/authRoutes.js';
import bookRoutes from './routers/bookRoutes.js';
import transactionRoutes from './routers/transactionRoutes.js';
import reviewRoutes from './routers/reviewRoutes.js';
import adminRoutes from './routers/adminRoutes.js';

// Load .env relative to this file — works regardless of cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:3000',
    'http://localhost:5000',
];
app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (curl, Postman, same-origin)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
    res.json({ 
        status: "✅ Library Management API is running!",
        port: PORT,
        routes: ['/api/auth', '/api/books', '/api/transactions', '/api/reviews', '/api/admin']
    });
});

// ── Serve Frontend Static Files ───────────────────────────────
// HTML pages live at /login_page.html, /books_catalog.html, etc.
const frontendPages = path.resolve(__dirname, '../Frontend/src/pages');
const frontendSrc   = path.resolve(__dirname, '../Frontend/src');

app.use(express.static(frontendPages)); // serves .html at root
app.use(express.static(frontendSrc));   // serves ../js, ../styles, ../utils relative refs

// Redirect root → login
app.get('/', (req, res) => res.redirect('/login_page.html'));

// Mounted API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Base: http://localhost:${PORT}/api`);
    console.log(`📖 Books API: http://localhost:${PORT}/api/books`);
    console.log(`🔐 Auth API:  http://localhost:${PORT}/api/auth`);
    console.log(`📊 Admin API: http://localhost:${PORT}/api/admin/stats\n`);
});