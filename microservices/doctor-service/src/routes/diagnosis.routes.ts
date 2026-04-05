import express from "express";
import {
    createDiagnosis, getDiagnosisByAppointment, getDiagnosesByDoctor,
    getDiagnosesByPatient, getAllDiagnoses, updateDiagnosis, getRevenueStats,
} from "../controllers/diagnosis.controller.js";

const router = express.Router();

// Specific routes first (before parameterized routes)
router.get("/stats/revenue", getRevenueStats);
router.get("/appointment/:appointmentId", getDiagnosisByAppointment);
router.get("/doctor/:doctorId", getDiagnosesByDoctor);
router.get("/patient/:patientId", getDiagnosesByPatient);

// Create diagnosis
router.post("/", createDiagnosis);

// Generic routes last
router.put("/:diagnosisId", updateDiagnosis);
router.get("/", getAllDiagnoses);

export default router;
