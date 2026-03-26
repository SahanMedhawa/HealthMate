import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import adminRoutes from "./routes/admin.routes.js";

dotenv.config();
const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", process.env.FRONTEND_URL || "http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use("/api/admin", adminRoutes);
app.get("/api/health", (_req, res) => { res.json({ status: "ok", service: "admin-service", port: process.env.PORT || 5004, timestamp: new Date().toISOString() }); });
app.use("*", (_req, res) => { res.status(404).json({ success: false, message: "Route not found" }); });

const PORT = process.env.PORT || 5004;
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/healthmate_admin")
    .then(() => { console.log("Admin Service: MongoDB connected"); app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`)); })
    .catch((err) => { console.error("Admin Service: MongoDB connection error:", err); process.exit(1); });

export default app;
