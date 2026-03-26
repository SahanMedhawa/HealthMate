import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Admin from "../models/admin.model.js";
import { generateToken } from "../middleware/auth.middleware.js";
import axios from "axios";

const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || "http://localhost:5002";
const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5003";
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || "http://localhost:5001";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5006";

const getForwardedAuthHeader = (req: Request): { Authorization?: string } => {
    const auth = req.headers.authorization;
    if (!auth) return {};
    return { Authorization: Array.isArray(auth) ? auth[0] : auth };
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;
        if (!username || !password) { res.status(400).json({ success: false, message: "Username and password required." }); return; }
        const admin = await Admin.findOne({ username: username.toLowerCase(), isActive: true }).select("+password");
        if (!admin) { res.status(401).json({ success: false, message: "Invalid credentials." }); return; }
        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) { res.status(401).json({ success: false, message: "Invalid credentials." }); return; }
        admin.lastLogin = new Date();
        await admin.save();
        const token = generateToken({ id: admin._id, username: admin.username, role: admin.role });
        res.status(200).json({ success: true, message: "Login successful.", data: { token, admin: { id: admin._id, username: admin.username, fullName: admin.fullName, email: admin.email, role: admin.role, lastLogin: admin.lastLogin } } });
    } catch (error) { console.error("Admin login error:", error); res.status(500).json({ success: false, message: "Internal server error." }); }
};

export const getAdminProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = await Admin.findById(req.admin?.id);
        if (!admin) { res.status(404).json({ success: false, message: "Admin not found." }); return; }
        res.status(200).json({ success: true, data: { admin: { id: admin._id, username: admin.username, fullName: admin.fullName, email: admin.email, role: admin.role, lastLogin: admin.lastLogin, createdAt: admin.get("createdAt") } } });
    } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
};

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        let doctorStats = { totalDoctors: 0, activeDoctors: 0 };
        let patientStats = { totalPatients: 0 };
        let appointmentStats: any = { total: 0, pending: 0, completed: 0, cancelled: 0, today: 0, weekly: 0, monthly: 0 };
        let recentAppointments: any[] = [];

        // Fetch Doctors
        try {
            const r = await axios.get(`${DOCTOR_SERVICE_URL}/api/doctors`);
            const doctors = r.data.doctors || [];
            doctorStats.totalDoctors = doctors.length;
            doctorStats.activeDoctors = doctors.filter((d: any) => d.userType === "doctor").length;
        } catch (e: any) { console.warn("Doctor stats failed:", e.message); }

        // Fetch Patients
        try {
            const r = await axios.get(`${PATIENT_SERVICE_URL}/api/patient`);
            const patients = r.data.patients || [];
            patientStats.totalPatients = patients.length;
        } catch (e: any) { console.warn("Patient stats failed:", e.message); }

        // Fetch Appointments and Calculate Stats
        try {
            const r = await axios.get(`${APPOINTMENT_SERVICE_URL}/api/appointment`);
            const allAppointments = r.data.appointments || r.data || [];

            appointmentStats.total = allAppointments.length;
            appointmentStats.pending = allAppointments.filter((x: any) => x.status === "booked").length;
            appointmentStats.completed = allAppointments.filter((x: any) => x.status === "completed").length;
            appointmentStats.cancelled = allAppointments.filter((x: any) => x.status === "cancelled").length;

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);

            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);

            appointmentStats.today = allAppointments.filter((x: any) => x.date === todayStr).length;
            appointmentStats.weekly = allAppointments.filter((x: any) => new Date(x.date) >= oneWeekAgo).length;
            appointmentStats.monthly = allAppointments.filter((x: any) => new Date(x.date) >= oneMonthAgo).length;

            recentAppointments = [...allAppointments]
                .sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                .slice(0, 10);

        } catch (e: any) { console.warn("Appt stats failed:", e.message); }

        res.status(200).json({
            success: true,
            data: {
                userStats: { ...doctorStats, ...patientStats },
                appointmentStats,
                recentAppointments
            }
        });
    } catch (error: any) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const createDoctorByAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const r = await axios.post(`${DOCTOR_SERVICE_URL}/api/doctors/signup`, req.body);
        try { await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notify/email`, { type: "doctor-credentials", to: req.body.email, password: req.body.password, fullName: req.body.fullName }); } catch (e: any) { console.warn("Email failed:", e.message); }
        res.status(201).json(r.data);
    } catch (error: any) { res.status(error.response?.status || 500).json(error.response?.data || { success: false, message: "Failed to create doctor" }); }
};

export const updateDoctorByAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const r = await axios.put(
            `${DOCTOR_SERVICE_URL}/api/doctors/${req.params.doctorId}`,
            req.body,
            { headers: getForwardedAuthHeader(req) }
        );
        res.status(200).json(r.data);
    }
    catch (error: any) { res.status(error.response?.status || 500).json(error.response?.data || { success: false, message: "Failed" }); }
};

export const deleteDoctorByAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const r = await axios.delete(
            `${DOCTOR_SERVICE_URL}/api/doctors/${req.params.doctorId}`,
            { headers: getForwardedAuthHeader(req) }
        );
        res.status(200).json(r.data);
    }
    catch (error: any) { res.status(error.response?.status || 500).json(error.response?.data || { success: false, message: "Failed" }); }
};

export const cancelAppointmentAdmin = async (req: Request, res: Response): Promise<void> => {
    try { const r = await axios.post(`${APPOINTMENT_SERVICE_URL}/api/appointment/${req.params.appointmentId}/cancel`, { reason: req.body.reason || "Cancelled by admin", cancelledBy: "admin" }); res.status(200).json(r.data); }
    catch (error: any) { res.status(error.response?.status || 500).json(error.response?.data || { success: false, message: "Failed" }); }
};

export const getAllAppointmentsAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 10, status, date } = req.query as any;
        const pNum = Number(page);
        const lNum = Number(limit);

        const r = await axios.get(`${APPOINTMENT_SERVICE_URL}/api/appointment`);
        let appointments = r.data || [];

        // Apply filters locally if sub-service doesn't support them yet
        if (status && status !== "all") {
            appointments = appointments.filter((a: any) => a.status === status);
        }
        if (date) {
            appointments = appointments.filter((a: any) => a.date === date);
        }

        const total = appointments.length;
        const totalPages = Math.ceil(total / lNum) || 1;
        const sliced = appointments.slice((pNum - 1) * lNum, pNum * lNum);

        res.status(200).json({
            success: true,
            data: {
                appointments: sliced,
                pagination: {
                    currentPage: pNum,
                    totalPages,
                    totalAppointments: total,
                    hasNextPage: pNum < totalPages,
                    hasPrevPage: pNum > 1
                }
            }
        });
    } catch (error: any) {
        console.error("Get appointments error:", error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { success: false, message: "Failed to fetch appointments" });
    }
};

export const getAllQueuesAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const r = await axios.get(`${APPOINTMENT_SERVICE_URL}/api/doctor/queue/admin/queues`);
        res.status(200).json({ success: true, data: r.data });
    } catch (error: any) {
        res.status(error.response?.status || 500).json(error.response?.data || { success: false, message: "Failed" });
    }
};

export const getQueueStatsAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const r = await axios.get(`${APPOINTMENT_SERVICE_URL}/api/doctor/queue/admin/queue-stats`);
        res.status(200).json({ success: true, data: r.data });
    } catch (error: any) {
        res.status(error.response?.status || 500).json(error.response?.data || { success: false, message: "Failed" });
    }
};

export const getUsersByAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userType, page = 1, limit = 10 } = req.query as any;
        const pNum = Number(page);
        const lNum = Number(limit);

        let users: any[] = [];
        if (userType === "doctor") {
            const r = await axios.get(`${DOCTOR_SERVICE_URL}/api/doctors`);
            users = r.data.doctors || [];
        } else if (userType === "patient") {
            const r = await axios.get(`${PATIENT_SERVICE_URL}/api/patient`);
            users = r.data.patients || [];
        } else {
            // Fetch both for "all" or undefined filter
            const [dR, pR] = await Promise.allSettled([
                axios.get(`${DOCTOR_SERVICE_URL}/api/doctors`),
                axios.get(`${PATIENT_SERVICE_URL}/api/patient`)
            ]);
            const dUsers = dR.status === 'fulfilled' ? (dR.value.data.doctors || []) : [];
            const pUsers = pR.status === 'fulfilled' ? (pR.value.data.patients || []) : [];
            users = [...dUsers, ...pUsers];
        }

        const total = users.length;
        const totalPages = Math.ceil(total / lNum) || 1;
        const sliced = users.slice((pNum - 1) * lNum, pNum * lNum);

        res.status(200).json({
            success: true,
            data: {
                users: sliced,
                pagination: {
                    currentPage: pNum,
                    totalPages,
                    totalUsers: total,
                    hasNextPage: pNum < totalPages,
                    hasPrevPage: pNum > 1
                }
            }
        });
    } catch (error: any) {
        console.error("Get users error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
};

export const toggleUserStatusAdmin = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true, message: "User status toggled" });
};
