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
app.use(router);
app.use(express.static('public'));

// Connect to database
connectDB().catch((error) => {
    console.error("❌ Failed to connect to the database:", error);
});

// Export the Express app as a Vercel serverless function
export default app;