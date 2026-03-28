import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import patientRoutes from "./routes/patient.routes.js";
import "./config/firebase.js";


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
app.use("/api/patient", patientRoutes);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "patient-service",
        port: process.env.PORT || 5001,
        timestamp: new Date().toISOString(),
    });
});

// 404
app.use("*", (_req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// Start
const PORT = process.env.PORT || 5001;
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/healthmate_patients";

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("Patient Service: MongoDB connected");
        app.listen(PORT, () => {
            console.log(`Patient Service running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Patient Service: MongoDB connection error:", err);
        process.exit(1);
    });

export default app;
