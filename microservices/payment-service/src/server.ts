import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import receiptRoutes from "./payment_routes/receiptRoutes.js";
import paymentRoutes from "./payment_routes/paymentRoutes.js";
import governmentRoutes from "./payment_routes/governmentRoutes.js";
import insuranceRoutes from "./payment_routes/insuranceRoutes.js";

const app = express();

// ----- Middleware -----
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

// ----- Routes -----
app.use("/api/receipts", receiptRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/government", governmentRoutes);
app.use("/api/insurance", insuranceRoutes);

// ----- Health Check -----
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "payment-service",
    port: process.env.PORT || 5008,
    timestamp: new Date().toISOString(),
  });
});

// ----- 404 -----
app.use("*", (_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ----- Server & DB -----
const PORT = Number(process.env.PORT) || 5008;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://mongodb:27017/healthmate_payments"; // Use Docker service name

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Payment Service: MongoDB connected");

    // Bind to 0.0.0.0 for Docker container networking
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Payment Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Payment Service: MongoDB connection error:", err);
    process.exit(1);
  });

export default app;