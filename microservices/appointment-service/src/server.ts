import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import appointmentRoutes from "./routes/appointment.routes.js";
import queueRoutes from "./routes/queue.routes.js";

dotenv.config();
const app = express();

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", process.env.FRONTEND_URL || "http://localhost:5173"],
    credentials: true,
}));
app.use(express.json());

app.use("/api/appointment", appointmentRoutes);
app.use("/api/doctor/queue", queueRoutes);

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "appointment-service", port: process.env.PORT || 5003, timestamp: new Date().toISOString() });
});

app.use("*", (_req, res) => { res.status(404).json({ success: false, message: "Route not found" }); });

const PORT = process.env.PORT || 5003;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/healthmate_appointments";

mongoose.connect(MONGO_URI)
    .then(() => { console.log("Appointment Service: MongoDB connected"); app.listen(PORT, () => console.log(`Appointment Service running on port ${PORT}`)); })
    .catch((err) => { console.error("Appointment Service: MongoDB connection error:", err); process.exit(1); });

export default app;
