import express from "express";
import { sendEmail, broadcastQueueUpdate, broadcastAppointmentUpdate, sendToUser } from "../controllers/notification.controller.js";

const router = express.Router();

router.post("/email", sendEmail);
router.post("/queue-update", broadcastQueueUpdate);
router.post("/appointment-update", broadcastAppointmentUpdate);
router.post("/user", sendToUser);

export default router;
