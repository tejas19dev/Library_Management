import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { supabase } from "./utils/supabase.js";

import authRoutes from './routers/authRoutes.js';
import bookRoutes from './routers/bookRoutes.js';
import transactionRoutes from './routers/transactionRoutes.js';
import reviewRoutes from './routers/reviewRoutes.js';
import adminRoutes from './routers/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000', 'http://localhost:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

// Mounted Routes
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