import express from "express";
import {
    pauseQueue, resumeQueue, getQueueStatus, getDoctorQueues,
    rescheduleAppointmentByDoctor, cancelAppointmentByDoctor,
    getAllQueues, getQueueStats,
} from "../controllers/queue.controller.js";

const router = express.Router();

router.post("/pause", pauseQueue);
router.post("/resume", resumeQueue);
router.get("/status", getQueueStatus);
router.get("/", getDoctorQueues);
router.post("/appointment/:id/reschedule", rescheduleAppointmentByDoctor);
router.post("/appointment/:id/cancel", cancelAppointmentByDoctor);
router.get("/admin/queues", getAllQueues);
router.get("/admin/queue-stats", getQueueStats);

export default router;
