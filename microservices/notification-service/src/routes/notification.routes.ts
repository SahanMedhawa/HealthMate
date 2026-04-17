import express from "express";
import { 
    sendEmail, 
    broadcastQueueUpdate, 
    broadcastAppointmentUpdate, 
    sendToUser,
    getNotificationHistory,
    getNotificationStats,
    processReminders
} from "../controllers/notification.controller.js";

const router = express.Router();

// ========== EXISTING ROUTES ==========
router.post("/email", sendEmail);
router.post("/queue-update", broadcastQueueUpdate);
router.post("/appointment-update", broadcastAppointmentUpdate);
router.post("/user", sendToUser);

// ========== FRONTEND-FACING ROUTES ==========
// Get notification history for a patient
router.get("/history/:patientId", getNotificationHistory);

// Get notification statistics for a patient
router.get("/stats/:patientId", getNotificationStats);

// ========== REMINDER MANAGEMENT ==========
// Process pending reminders (call this via cron job every hour)
router.post("/process-reminders", processReminders);

export default router;