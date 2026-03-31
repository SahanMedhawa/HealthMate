import type { Request, Response } from "express";
import { SocketService } from "../services/SocketService.js";
import { sendVerificationEmail, sendDoctorCredentialsEmail } from "../services/EmailService.js";

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
    try { SocketService.broadcastAppointmentUpdate(req.body); res.status(200).json({ success: true, message: "Appointment update broadcasted" }); }
    catch (error: any) { res.status(500).json({ success: false, message: "Failed", error: error.message }); }
};

export const sendToUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, event, data } = req.body;
        if (!userId || !event) { res.status(400).json({ success: false, message: "userId and event required" }); return; }
        SocketService.sendToUser(userId, event, data);
        res.status(200).json({ success: true, message: `Notification sent to ${userId}` });
    } catch (error: any) { res.status(500).json({ success: false, message: "Failed", error: error.message }); }
};
