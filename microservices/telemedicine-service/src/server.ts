import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "telemedicine-service", port: process.env.PORT || 5005, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5005;
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/healthmate_telemedicine")
    .then(() => { console.log("Telemedicine DB connected"); app.listen(PORT, () => console.log(`Telemedicine Service running on port ${PORT}`)); })
    .catch((err) => { console.error("DB error:", err); process.exit(1); });

export default app;
