import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/ai.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => console.log(`AI Service running on port ${PORT}`));