import express from "express";
import { firebaseLogin, getUserById, getAllPatients } from "../controllers/patient.controller.js";

const router = express.Router();

// POST /api/patient/firebase-login
router.post("/firebase-login", firebaseLogin);

// GET /api/patient/user/:id
router.get("/user/:id", getUserById);
router.get("/", getAllPatients);

export default router;
