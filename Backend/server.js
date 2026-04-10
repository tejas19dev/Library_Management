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

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Library Management System API is running!");
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);


app.listen(process.env.PORT || 4001, () => {
    console.log(`Server is successfully running on http://localhost:${process.env.PORT}`);
    console.log(`Ready to serve /api/books!`);
});