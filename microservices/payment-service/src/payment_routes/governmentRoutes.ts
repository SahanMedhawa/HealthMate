import express from "express";
import { governmentController } from "../payment/governmentController.js";

const router = express.Router();

// 🏛️ Government Funding
router.post("/government-funding", governmentController.createFunding);
router.get("/government-funding/:id", governmentController.getFundingById);
router.put("/government-funding/:id", governmentController.updateFunding);
router.delete("/government-funding/:id", governmentController.deleteFunding);

export default router;