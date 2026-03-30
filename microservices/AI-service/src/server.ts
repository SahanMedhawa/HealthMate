import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "ai-service", port: process.env.PORT || 5007, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5007;

app.listen(PORT, () => console.log(`AI Service running on port ${PORT}`));

export default app;
