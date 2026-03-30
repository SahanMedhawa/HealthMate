import type { Request, Response } from "express";
import { QueueService } from "../services/QueueService.js";
import { Appointment } from "../models/appointment.model.js";
import axios from "axios";

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5006";

async function notifyQueueUpdate(payload: any): Promise<void> { try { await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notify/queue-update`, payload); } catch (e: any) { console.warn("Queue notify failed:", e.message); } }
async function notifyAppointmentUpdate(payload: any): Promise<void> { try { await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notify/appointment-update`, payload); } catch (e: any) { console.warn("Appt notify failed:", e.message); } }

export const pauseQueue = async (req: Request, res: Response): Promise<void> => {
    try {
        const doctorId = req.doctor?.id || req.body.doctorId;
        const { date, reason } = req.body;
        if (!doctorId) { res.status(401).json({ success: false, message: "Doctor auth required" }); return; }
        const queueDate = date || new Date().toISOString().split("T")[0]!;
        const queue = await QueueService.pauseQueue(doctorId, queueDate, reason);
        notifyQueueUpdate({ doctorId, date: queueDate, status: "paused", pauseReason: reason, timestamp: new Date() });
        res.status(200).json({ success: true, message: "Queue paused", data: { queue } });
    } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const resumeQueue = async (req: Request, res: Response): Promise<void> => {
    try {
        const doctorId = req.doctor?.id || req.body.doctorId;
        const { date } = req.body;
        if (!doctorId) { res.status(401).json({ success: false, message: "Doctor auth required" }); return; }
        const queueDate = date || new Date().toISOString().split("T")[0]!;
        const queue = await QueueService.resumeQueue(doctorId, queueDate);
        notifyQueueUpdate({ doctorId, date: queueDate, status: "active", timestamp: new Date() });
        res.status(200).json({ success: true, message: "Queue resumed", data: { queue } });
    } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const getQueueStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const doctorId = (req.query.doctorId as string) || req.doctor?.id || req.body.doctorId;
        const date = (req.query.date as string) || new Date().toISOString().split("T")[0]!;
        if (!doctorId) { res.status(401).json({ success: false, message: "Doctor ID required" }); return; }
        const status = await QueueService.getQueueStatus(doctorId, date);
        res.status(200).json({ success: true, data: status });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const getDoctorQueues = async (req: Request, res: Response): Promise<void> => {
    try {
        const doctorId = req.doctor?.id || (req.query.doctorId as string);
        if (!doctorId) { res.status(401).json({ success: false, message: "Doctor ID required" }); return; }
        const queues = await QueueService.getDoctorQueues(doctorId);
        res.status(200).json({ success: true, data: { queues } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const rescheduleAppointmentByDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { newDate, newTime, reason } = req.body;
        const doctorId = req.doctor?.id || req.body.doctorId;
        if (!doctorId) { res.status(401).json({ success: false, message: "Doctor auth required" }); return; }
        if (!newDate || !newTime) { res.status(400).json({ success: false, message: "New date and time required" }); return; }
        const appt = await Appointment.findById(id);
        if (!appt) { res.status(404).json({ success: false, message: "Not found" }); return; }
        if (appt.doctorId.toString() !== doctorId) { res.status(403).json({ success: false, message: "Not your appointment" }); return; }
        if (["completed", "cancelled"].includes(appt.status)) { res.status(400).json({ success: false, message: `Cannot reschedule ${appt.status}` }); return; }
        const conflict = await Appointment.findOne({ doctorId: appt.doctorId, date: newDate, time: newTime, _id: { $ne: id } });
        if (conflict) { res.status(400).json({ success: false, message: "Slot taken" }); return; }
        const updated = await Appointment.findByIdAndUpdate(id, { date: newDate, time: newTime, rescheduledFrom: { date: appt.date, time: appt.time }, rescheduledReason: reason || "Rescheduled by doctor", rescheduledAt: new Date(), status: "booked" }, { new: true });
        notifyAppointmentUpdate({ appointmentId: id, doctorId, patientId: appt.patientId?.toString(), action: "rescheduled", date: newDate });
        res.status(200).json({ success: true, message: "Rescheduled by doctor", data: { appointment: updated } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const cancelAppointmentByDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const doctorId = req.doctor?.id || req.body.doctorId;
        if (!doctorId) { res.status(401).json({ success: false, message: "Doctor auth required" }); return; }
        if (!reason) { res.status(400).json({ success: false, message: "Reason required" }); return; }
        const appt = await Appointment.findById(id);
        if (!appt) { res.status(404).json({ success: false, message: "Not found" }); return; }
        if (appt.doctorId.toString() !== doctorId) { res.status(403).json({ success: false, message: "Not your appointment" }); return; }
        if (appt.status === "completed") { res.status(400).json({ success: false, message: "Cannot cancel completed" }); return; }
        if (appt.status === "cancelled") { res.status(400).json({ success: false, message: "Already cancelled" }); return; }
        const updated = await Appointment.findByIdAndUpdate(id, { status: "cancelled", cancellationReason: reason, cancelledBy: "doctor", cancelledAt: new Date() }, { new: true });
        notifyAppointmentUpdate({ appointmentId: id, doctorId, patientId: appt.patientId?.toString(), action: "cancelled", date: appt.date });
        res.status(200).json({ success: true, message: "Cancelled by doctor", data: { appointment: updated } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const getAllQueues = async (_req: Request, res: Response): Promise<void> => {
    try { res.status(200).json({ success: true, data: { queues: await QueueService.getAllActiveQueues() } }); }
    catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const getQueueStats = async (_req: Request, res: Response): Promise<void> => {
    try { res.status(200).json({ success: true, data: await QueueService.getQueueStats() }); }
    catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};
