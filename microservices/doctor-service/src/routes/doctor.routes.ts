import express from "express";
import { requireAdmin } from "../middleware/auth.middleware.js";
import {
    doctorSignup, doctorLogin, createDoctor, getDoctors, getDoctorById,
    updateDoctor, updateDoctorProfile, changeDoctorPassword, getDoctorPatients, deleteDoctor,
} from "../controllers/doctor.controller.js";

const router = express.Router();

// Public auth
router.post("/signup", doctorSignup);
router.post("/login", doctorLogin);

// Public read
router.get("/", getDoctors);
router.get("/:id", getDoctorById);

// Doctor self-management
router.patch("/:id/profile", updateDoctorProfile);
router.patch("/:id/password", changeDoctorPassword);
router.get("/:id/patients", getDoctorPatients);

// Admin-only
router.post("/create", requireAdmin, createDoctor);
router.put("/:id", requireAdmin, updateDoctor);
router.delete("/:id", requireAdmin, deleteDoctor);

export default router;
