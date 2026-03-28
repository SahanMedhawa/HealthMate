import type { Request, Response } from "express";
import { Appointment } from "../models/appointment.model.js";
import Queue from "../models/queue.model.js";
import { normalizeDate } from "../services/QueueService.js";
import axios from "axios";
import mongoose from "mongoose";

const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || "http://localhost:5002";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5006";

async function getDoctorStartTime(doctorId: string, date: string): Promise<string | null> {
    try {
        const res = await axios.get(`${DOCTOR_SERVICE_URL}/api/doctors/${doctorId}`);
        const doc = res.data.doctor;
        if (!doc?.availability) return null;
        const avail = doc.availability.find((a: any) => {
            const d = typeof a.date === "string" ? a.date.split("T")[0] : new Date(a.date).toISOString().split("T")[0];
            return d === date;
        });
        return avail ? avail.startTime : null;
    } catch { return null; }
}

function getSlotIndex(startTime: string, bookedTime: string): number {
    const [sH, sM] = startTime.split(":").map(Number);
    const [bH, bM] = bookedTime.split(":").map(Number);
    return Math.floor(((bH! * 60 + (bM || 0)) - (sH! * 60 + (sM || 0))) / 30);
}

async function notifyAppointmentUpdate(payload: any): Promise<void> {
    try { await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notify/appointment-update`, payload); } catch (e: any) { console.warn("Notify failed:", e.message); }
}

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { patientId, patientName, patientAddress, patientContact, doctorId, doctorName, date, time, notes } = req.body;
        const nd = normalizeDate(date);

        const existDoc = await Appointment.findOne({ doctorId, date: nd, time });
        if (existDoc) { res.status(400).json({ success: false, message: "Time slot already booked for doctor." }); return; }

        const existPat = await Appointment.findOne({ patientId, date: nd, time });
        if (existPat) { res.status(400).json({ success: false, message: "Patient already has appointment at this time." }); return; }

        const startTime = await getDoctorStartTime(doctorId, nd);
        if (!startTime) { res.status(400).json({ success: false, message: "Doctor not available on this date" }); return; }

        const slotIdx = getSlotIndex(startTime, time);
        if (slotIdx < 0) { res.status(400).json({ success: false, message: "Invalid booking time" }); return; }

        await Queue.findOneAndUpdate({ doctorId, date: nd }, { $setOnInsert: { status: "active" } }, { upsert: true, new: true });

        const appointment = await Appointment.create({
            patientId, patientName, patientAddress, patientContact, doctorId, doctorName,
            date: nd, time, queueNumber: slotIdx + 1, notes, status: "booked",
        });

        notifyAppointmentUpdate({ appointmentId: appointment._id.toString(), doctorId, patientId, action: "updated", date: nd });
        res.status(201).json({ success: true, message: "Appointment booked successfully.", data: appointment });
    } catch (error: any) { res.status(500).json({ success: false, message: "Error creating appointment", error: error.message }); }
};

export const getAppointments = async (_req: Request, res: Response): Promise<void> => {
    try { res.status(200).json(await Appointment.find()); } catch (error) { res.status(500).json({ message: "Error fetching appointments", error }); }
};

export const getAppointmentById = async (req: Request, res: Response): Promise<void> => {
    try {
        const appt = await Appointment.findById(req.params.id);
        if (!appt) { res.status(404).json({ message: "Appointment not found" }); return; }
        res.status(200).json(appt);
    } catch (error) { res.status(500).json({ message: "Error fetching appointment", error }); }
};

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
        const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!appt) { res.status(404).json({ success: false, message: "Appointment not found" }); return; }
        notifyAppointmentUpdate({ appointmentId: req.params.id, doctorId: appt.doctorId?.toString(), patientId: appt.patientId?.toString(), action: "updated", date: appt.date });
        res.status(200).json({ success: true, data: appt, message: "Appointment updated successfully" });
    } catch (error: any) { res.status(500).json({ success: false, message: "Error updating appointment", error: error.message }); }
};

export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
        const appt = await Appointment.findByIdAndDelete(req.params.id);
        if (!appt) { res.status(404).json({ message: "Appointment not found" }); return; }
        notifyAppointmentUpdate({ appointmentId: req.params.id, doctorId: appt.doctorId?.toString(), patientId: appt.patientId?.toString(), action: "cancelled", date: appt.date });
        res.status(200).json({ message: "Appointment deleted successfully" });
    } catch (error) { res.status(500).json({ message: "Error deleting appointment", error }); }
};

export const cancelAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { reason, cancelledBy } = req.body;
        if (!reason) { res.status(400).json({ success: false, message: "Cancellation reason required" }); return; }
        const appt = await Appointment.findById(id);
        if (!appt) { res.status(404).json({ success: false, message: "Appointment not found" }); return; }
        if (appt.status === "completed") { res.status(400).json({ success: false, message: "Cannot cancel completed appointment" }); return; }
        if (appt.status === "cancelled") { res.status(400).json({ success: false, message: "Already cancelled" }); return; }
        const updated = await Appointment.findByIdAndUpdate(id, { status: "cancelled", cancellationReason: reason, cancelledBy, cancelledAt: new Date() }, { new: true });
        notifyAppointmentUpdate({ appointmentId: id, doctorId: appt.doctorId?.toString(), patientId: appt.patientId?.toString(), action: "cancelled", date: appt.date });
        res.status(200).json({ success: true, message: "Appointment cancelled", data: updated });
    } catch (error: any) { res.status(500).json({ success: false, message: "Error cancelling", error: error.message }); }
};

export const rescheduleAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { newDate, newTime, reason } = req.body;
        if (!newDate || !newTime) { res.status(400).json({ success: false, message: "New date and time required" }); return; }
        const appt = await Appointment.findById(id);
        if (!appt) { res.status(404).json({ success: false, message: "Appointment not found" }); return; }
        if (["completed", "cancelled"].includes(appt.status)) { res.status(400).json({ success: false, message: `Cannot reschedule ${appt.status} appointment` }); return; }
        const conflict = await Appointment.findOne({ doctorId: appt.doctorId, date: newDate, time: newTime, _id: { $ne: id } });
        if (conflict) { res.status(400).json({ success: false, message: "Slot already booked" }); return; }
        const updated = await Appointment.findByIdAndUpdate(id, { date: newDate, time: newTime, rescheduledFrom: { date: appt.date, time: appt.time }, rescheduledReason: reason, rescheduledAt: new Date(), status: "booked" }, { new: true });
        notifyAppointmentUpdate({ appointmentId: id, doctorId: appt.doctorId?.toString(), patientId: appt.patientId?.toString(), action: "rescheduled", date: newDate });
        res.status(200).json({ success: true, message: "Appointment rescheduled", data: updated });
    } catch (error: any) { res.status(500).json({ success: false, message: "Error rescheduling", error: error.message }); }
};

export const getAppointmentsByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
        const { patientId } = req.params;
        const appointments = await Appointment.find({ patientId }).sort({ date: -1, time: -1 });
        res.status(200).json({ success: true, data: appointments || [] });
    } catch (error: any) { res.status(500).json({ success: false, message: "Error fetching appointments", error: error.message }); }
};

export const getDoctorAppointmentsByDate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { doctorId, date } = req.params;
        const oid = new mongoose.Types.ObjectId(doctorId);
        const appointments = await Appointment.find({ doctorId: oid, date }).sort({ queueNumber: 1 })
            .select("_id patientId patientName patientAddress patientContact time queueNumber status notes date");
        res.json({ success: true, appointments });
    } catch (error) { res.status(500).json({ success: false, message: "Error", error }); }
};

export const getDoctorAppointments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { doctorId } = req.params;
        const oid = new mongoose.Types.ObjectId(doctorId);
        const appointments = await Appointment.find({ doctorId: oid }).sort({ date: -1, time: -1 })
            .select("_id patientId patientName patientAddress patientContact time queueNumber status notes date");
        res.json({ success: true, appointments });
    } catch (error) { res.status(500).json({ success: false, message: "Error", error }); }
};
