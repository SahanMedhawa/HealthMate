import express from "express";
import { requireAdmin } from "../middleware/auth.middleware.js";
import {
    adminLogin, getAdminProfile, getDashboardStats,
    createDoctorByAdmin, updateDoctorByAdmin, deleteDoctorByAdmin, cancelAppointmentAdmin,
    getAllAppointmentsAdmin, getAllQueuesAdmin, getQueueStatsAdmin,
    getUsersByAdmin, toggleUserStatusAdmin
} from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/profile", requireAdmin, getAdminProfile);
router.get("/stats", requireAdmin, getDashboardStats);
router.post("/doctors", requireAdmin, createDoctorByAdmin);
router.put("/doctors/:doctorId", requireAdmin, updateDoctorByAdmin);
router.delete("/doctors/:doctorId", requireAdmin, deleteDoctorByAdmin);
router.put("/appointments/:appointmentId/cancel", requireAdmin, cancelAppointmentAdmin);
router.get("/appointments", requireAdmin, getAllAppointmentsAdmin);
router.get("/queues", requireAdmin, getAllQueuesAdmin);
router.get("/queue-stats", requireAdmin, getQueueStatsAdmin);
router.get("/users", requireAdmin, getUsersByAdmin);
router.put("/users/:userId/status", requireAdmin, toggleUserStatusAdmin);

export default router;
