import express from "express";
import {
    createDiagnosis, getDiagnosisByAppointment, getDiagnosesByDoctor,
    getDiagnosesByPatient, getAllDiagnoses, updateDiagnosis, getRevenueStats,
} from "../controllers/diagnosis.controller.js";

const router = express.Router();

router.post("/", createDiagnosis);
router.get("/appointment/:appointmentId", getDiagnosisByAppointment);
router.get("/doctor/:doctorId", getDiagnosesByDoctor);
router.get("/patient/:patientId", getDiagnosesByPatient);
router.get("/", getAllDiagnoses);
router.put("/:diagnosisId", updateDiagnosis);
router.get("/stats/revenue", getRevenueStats);

export default router;
