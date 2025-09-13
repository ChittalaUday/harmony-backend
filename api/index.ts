import express, { Request, Response } from "express";
import router from "../routes/userRoutes";
import admin from "../config/firebase";
import cors from 'cors';
import { connectDB } from "../config/db";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

app.use(cors({
    origin: "*", // Or use "*" for dev
    credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use(router);

// Static file serving (only in non-serverless environments)
if (process.env.NODE_ENV !== 'production') {
    app.use(express.static('public'));
}

// Connect to database
connectDB().catch((error) => {
    console.error("❌ Failed to connect to the database:", error);
});

// Export the Express app as a Vercel serverless function
export default app;