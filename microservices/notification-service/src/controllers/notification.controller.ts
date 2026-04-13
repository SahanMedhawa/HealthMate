import type { Request, Response } from "express";
import axios from "axios";
import { SocketService } from "../services/SocketService.js";
import { 
    sendVerificationEmail, 
    sendDoctorCredentialsEmail,
    sendBookingConfirmationEmail,
    sendConsultationReminderEmail,
    sendConsultationCompletionEmail,
    sendDoctorAppointmentNotification,
    sendDoctorConsultationCompletionEmail,
    sendCancellationEmail,
    sendRescheduleEmail
} from "../services/EmailService.js";
import Notification from "../models/notification.model.js";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "healthmate-internal-secret-key";
const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5003";

// ========== EXISTING FUNCTIONS ==========

export const sendEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, to, verificationToken, password, fullName } = req.body;
        if (!type || !to) { res.status(400).json({ success: false, message: "type and to required" }); return; }
        switch (type) {
            case "verification": await sendVerificationEmail(to, verificationToken); break;
            case "doctor-credentials": await sendDoctorCredentialsEmail(to, password, fullName); break;
            default: res.status(400).json({ success: false, message: `Unknown email type: ${type}` }); return;
        }
        res.status(200).json({ success: true, message: `${type} email sent to ${to}` });
    } catch (error: any) { console.error("Send email error:", error); res.status(500).json({ success: false, message: "Failed to send email", error: error.message }); }
};

export const broadcastQueueUpdate = async (req: Request, res: Response): Promise<void> => {
    try { SocketService.broadcastQueueUpdate(req.body); res.status(200).json({ success: true, message: "Queue update broadcasted" }); }
    catch (error: any) { res.status(500).json({ success: false, message: "Failed", error: error.message }); }
};

export const broadcastAppointmentUpdate = async (req: Request, res: Response): Promise<void> => {
    try {
        let { appointmentId, doctorId, patientId, action, date, time } = req.body;

        // ── FIX: When action is "updated", fetch the real appointment status
        // so that generic updateAppointment calls (e.g. status → "completed" or
        // a reschedule that stored rescheduledAt) are routed to the correct email.
        if (action === "updated" && appointmentId) {
            try {
                const apptRes = await axios.get(
                    `${APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}`,
                    { headers: { 'X-Internal-Api-Key': INTERNAL_API_KEY } }
                );
                const appt = apptRes.data;

                if (appt?.status === "completed") {
                    action = "completed";
                    console.log(`[Notification] Resolved action "updated" → "completed" for appointment ${appointmentId}`);
                } else if (appt?.status === "cancelled") {
                    action = "cancelled";
                    console.log(`[Notification] Resolved action "updated" → "cancelled" for appointment ${appointmentId}`);
                } else if (appt?.rescheduledAt) {
                    // Appointment was rescheduled (has rescheduledAt timestamp) but action
                    // came in as generic "updated" — route to reschedule email instead.
                    action = "rescheduled";
                    // Use the new date/time from the appointment record if not provided
                    date = date || appt.date;
                    time = time || appt.time;
                    console.log(`[Notification] Resolved action "updated" → "rescheduled" for appointment ${appointmentId}`);
                }
                // else: genuinely a booking/update → keep action as "updated" → booking email ✓
            } catch (err) {
                console.warn(`[Notification] Could not fetch appointment ${appointmentId} for action resolution:`, err);
                // Fall through with original action — booking email is the safest default
            }
        }

        console.log(`[Notification] Appointment ${action}:`, { appointmentId, doctorId, patientId });

        // Fetch patient and doctor details
        let patientEmail, patientName, doctorEmail, doctorName;

        try {
            const patientRes = await axios.get(`http://patient-service:5001/api/patient/public/user/${patientId}`, {
                headers: { 'X-Internal-Api-Key': INTERNAL_API_KEY }
            });
            patientEmail = patientRes.data.user?.email;
            patientName = patientRes.data.user?.name;
            console.log(`[Notification] Patient: ${patientName} (${patientEmail})`);
        } catch (err) {
            console.error('Failed to fetch patient details:', err);
        }

        try {
            const doctorRes = await axios.get(`http://doctor-service:5002/api/doctors/${doctorId}`);
            doctorEmail = doctorRes.data.doctor?.email;
            doctorName = doctorRes.data.doctor?.name || 'Doctor';
            console.log(`[Notification] Doctor: ${doctorName} (${doctorEmail})`);
        } catch (err) {
            console.error('Failed to fetch doctor details:', err);
        }

        // ========== HANDLE DIFFERENT ACTIONS ==========
        switch (action) {
            // 1. APPOINTMENT CREATED / BOOKING UPDATED — send to BOTH patient and doctor
            case 'created':
            case 'updated':
                console.log(`[Notification] Sending BOOKING emails...`);

                if (patientEmail) {
                    await sendBookingConfirmationEmail(
                        patientEmail, patientName || 'Patient', doctorName,
                        date || new Date().toLocaleDateString(),
                        time || 'Time TBD', appointmentId
                    );
                    console.log(`✅ Booking confirmation sent to patient ${patientEmail}`);

                    await Notification.create({
                        type: 'booking_confirmation',
                        recipient: patientEmail,
                        recipientType: 'email',
                        status: 'sent',
                        content: `Appointment confirmed with Dr. ${doctorName} on ${date}`,
                        appointmentId, patientId, doctorId,
                        sentAt: new Date()
                    });
                }

                if (doctorEmail) {
                    await sendDoctorAppointmentNotification(
                        doctorEmail, doctorName, patientName || 'Patient',
                        date || new Date().toLocaleDateString(),
                        time || 'Time TBD', appointmentId
                    );
                    console.log(`✅ New appointment notification sent to doctor ${doctorEmail}`);
                }
                break;

            // 2. APPOINTMENT COMPLETED — send to BOTH patient and doctor
            case 'completed':
                console.log(`[Notification] Sending COMPLETION emails to BOTH...`);

                if (patientEmail) {
                    await sendConsultationCompletionEmail(
                        patientEmail, patientName || 'Patient', doctorName,
                        date || new Date().toLocaleDateString()
                    );
                    console.log(`✅ Completion email sent to patient ${patientEmail}`);

                    await Notification.create({
                        type: 'completion',
                        recipient: patientEmail,
                        recipientType: 'email',
                        status: 'sent',
                        content: `Your consultation with Dr. ${doctorName} on ${date} has been completed.`,
                        appointmentId, patientId, doctorId,
                        sentAt: new Date()
                    });
                }

                if (doctorEmail) {
                    await sendDoctorConsultationCompletionEmail(
                        doctorEmail, doctorName, patientName || 'Patient',
                        date || new Date().toLocaleDateString()
                    );
                    console.log(`✅ Completion email sent to doctor ${doctorEmail}`);

                    await Notification.create({
                        type: 'completion',
                        recipient: doctorEmail,
                        recipientType: 'email',
                        status: 'sent',
                        content: `Consultation with patient ${patientName} on ${date} has been completed.`,
                        appointmentId, patientId, doctorId,
                        sentAt: new Date()
                    });
                }
                break;

            // 3. APPOINTMENT CANCELLED — send ONLY to patient
            case 'cancelled':
                console.log(`[Notification] Sending CANCELLATION email to patient...`);

                if (patientEmail) {
                    await sendCancellationEmail(
                        patientEmail, patientName || 'Patient', doctorName,
                        date || '', time || ''
                    );
                    console.log(`✅ Cancellation email sent to patient ${patientEmail}`);

                    await Notification.create({
                        type: 'cancellation',
                        recipient: patientEmail,
                        recipientType: 'email',
                        status: 'sent',
                        content: `Your appointment with Dr. ${doctorName} on ${date} has been cancelled.`,
                        appointmentId, patientId, doctorId,
                        sentAt: new Date()
                    });
                }
                // ❌ NO email to doctor for cancellation
                break;

            // 4. APPOINTMENT RESCHEDULED — send ONLY to patient
            case 'rescheduled':
                console.log(`[Notification] Sending RESCHEDULE email to patient...`);

                if (patientEmail) {
                    await sendRescheduleEmail(
                        patientEmail, patientName || 'Patient', doctorName,
                        date || '', time || ''
                    );
                    console.log(`✅ Reschedule email sent to patient ${patientEmail}`);

                    await Notification.create({
                        type: 'reschedule',
                        recipient: patientEmail,
                        recipientType: 'email',
                        status: 'sent',
                        content: `Your appointment with Dr. ${doctorName} has been rescheduled to ${date} at ${time}.`,
                        appointmentId, patientId, doctorId,
                        sentAt: new Date()
                    });
                }
                // ❌ NO email to doctor for reschedule
                break;

            default:
                console.log(`[Notification] Unknown action: ${action}`);
                break;
        }

        SocketService.broadcastAppointmentUpdate(req.body);
        res.status(200).json({ success: true, message: "Appointment update broadcasted" });

    } catch (error: any) {
        console.error("Error in broadcastAppointmentUpdate:", error);
        res.status(500).json({ success: false, message: "Failed", error: error.message });
    }
};

export const sendToUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, event, data } = req.body;
        if (!userId || !event) { res.status(400).json({ success: false, message: "userId and event required" }); return; }
        SocketService.sendToUser(userId, event, data);
        res.status(200).json({ success: true, message: `Notification sent to ${userId}` });
    } catch (error: any) { res.status(500).json({ success: false, message: "Failed", error: error.message }); }
};

// ========== FRONTEND-FACING FUNCTIONS ==========

export const getNotificationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { patientId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const notifications = await Notification.find({ patientId })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await Notification.countDocuments({ patientId });

        res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("Get notification history error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch notifications", error: error.message });
    }
};

export const getNotificationStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { patientId } = req.params;

        const byStatus = await Notification.aggregate([
            { $match: { patientId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const byType = await Notification.aggregate([
            { $match: { patientId } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);

        const total = await Notification.countDocuments({ patientId });

        res.status(200).json({
            success: true,
            data: { byStatus, byType, total }
        });
    } catch (error: any) {
        console.error("Get notification stats error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
    }
};

// ========== REMINDER MANAGEMENT ==========

export const processReminders = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const pendingReminders = await Notification.find({ 
            type: 'reminder', 
            status: 'pending',
            scheduledFor: { $lte: now }
        });

        for (const reminder of pendingReminders) {
            try {
                await sendConsultationReminderEmail(
                    reminder.recipient,
                    reminder.patientName || 'Patient',
                    reminder.doctorName || 'Doctor',
                    reminder.appointmentDate || new Date().toLocaleDateString(),
                    reminder.appointmentTime || 'Time'
                );

                reminder.status = 'sent';
                reminder.sentAt = new Date();
                await reminder.save();
            } catch (err: any) {
                reminder.status = 'failed';
                reminder.error = err.message;
                await reminder.save();
            }
        }

        res.status(200).json({ 
            success: true, 
            message: `Processed ${pendingReminders.length} reminders` 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Failed to process reminders", error: error.message });
    }
};