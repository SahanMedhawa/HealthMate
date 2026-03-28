import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import receiptRoutes from "./payment_routes/receiptRoutes.js";
import paymentRoutes from "./payment_routes/paymentRoutes.js";
import governmentRoutes from "./payment_routes/governmentRoutes.js";
import insuranceRoutes from "./payment_routes/insuranceRoutes.js";


dotenv.config();

const app = express();

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            process.env.FRONTEND_URL || "http://localhost:5173",
        ],
        credentials: true,
    })
);
app.use(express.json());

// Routes
app.use("/api/receipts", receiptRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/government", governmentRoutes);
app.use("/api/insurance", insuranceRoutes);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "payment-service",
        port: process.env.PORT || 5008,
        timestamp: new Date().toISOString(),
    });
});

// 404
app.use("*", (_req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// Start
const PORT = process.env.PORT || 5008;
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/healthmate_payments";

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("Payment Service: MongoDB connected");
        app.listen(PORT, () => {
            console.log(`Payment Service running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Payment Service: MongoDB connection error:", err);
        process.exit(1);
    });

export default app;
