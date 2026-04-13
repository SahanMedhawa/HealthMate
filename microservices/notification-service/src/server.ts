import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { SocketService } from "./services/SocketService.js";
import notificationRoutes from "./routes/notification.routes.js";
import { startReminderScheduler } from './services/ReminderScheduler.js';

dotenv.config();
const app = express();
const server = createServer(app);
SocketService.init(server);

// Start
const PORT = process.env.PORT || 5006;
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/notificationDB";

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("Notification Service: MongoDB connected");

        startReminderScheduler();

        server.listen(PORT, () => {
            console.log(`Notification Service running on port ${PORT}`);
            console.log("Socket.io enabled for real-time updates");
        });
    })
    .catch((err) => {
        console.error("Notification Service: MongoDB connection error:", err);
        process.exit(1);
    });

app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", process.env.FRONTEND_URL || "http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use("/api/notify", notificationRoutes);

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "notification-service", port: process.env.PORT || 5006, sockets: { connected: SocketService.getConnectedClientsCount() }, timestamp: new Date().toISOString() });
});

app.get("/api/socket/status", (_req, res) => {
    res.json({ success: true, data: { connected: SocketService.getConnectedClientsCount(), byType: { doctors: SocketService.getClientsByType("doctor"), patients: SocketService.getClientsByType("patient"), admins: SocketService.getClientsByType("admin") } } });
});

app.use("*", (_req, res) => { res.status(404).json({ success: false, message: "Route not found" }); });

export default app;
