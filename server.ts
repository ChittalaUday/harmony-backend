import express, { Request, Response } from "express";
import router from "./routes/userRoutes";
import admin from "./config/firebase";
import cors from "cors";
import { connectDB } from "./config/db";
import dotenv from "dotenv";
import os from "os";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Function to get local IP address
function getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "localhost";
}

// Middleware
app.use(
    cors({
        origin: "*", // You can replace "*" with specific IP/domain for security
        credentials: true,
    })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(router);
app.use(express.static("public"));

// Start server after DB connection
connectDB()
    .then(() => {
        const host = getLocalIP();
        app.listen(port, () => {
            console.log(`🚀 Server is running on http://${host}:${port}`);
        });
    })
    .catch((error) => {
        console.error("❌ Failed to connect to the database:", error);
    });
