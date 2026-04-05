import express from "express";
import { adminController } from "../payment/adminController.js";

const router = express.Router();

// 📊 Dashboard
router.get("/dashboard/stats", adminController.getDashboardStats);

// 🔵 READ - Admin Data
router.get("/insurance-claims", adminController.getAllInsuranceClaims);
router.get("/government-funding", adminController.getAllGovernmentFunding);
router.get("/transactions", adminController.getAllTransactions);

// 🟡 UPDATE - Insurance Claims and Government Funding
router.put("/insurance-claims/:id", adminController.updateInsuranceClaim);
router.put("/government-funding/:id", adminController.updateGovernmentFunding);

// 🔴 DELETE - Insurance Claims and Government Funding
router.delete("/insurance-claims/:id", adminController.deleteInsuranceClaim);
router.delete("/government-funding/:id", adminController.deleteGovernmentFunding);

export default router;