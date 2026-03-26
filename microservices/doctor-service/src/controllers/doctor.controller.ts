import type { Request, Response } from "express";
import User from "../models/doctor.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth.middleware.js";
import axios from "axios";

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5003";

const normalizeDate = (dateString: string): string => {
    try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        if (dateString.includes("T")) return dateString.split("T")[0]!;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error("Invalid date");
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    } catch {
        return dateString;
    }
};

export const doctorSignup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, fullName, specialization, yearsOfExperience, contactDetails, profilePictureUrl, availability } = req.body;
        if (!name || !email || !password || !fullName || !specialization) {
            res.status(400).json({ success: false, message: "Please provide all required fields" });
            return;
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) { res.status(400).json({ success: false, message: "A user with this email already exists" }); return; }
        if (password.length < 6) { res.status(400).json({ success: false, message: "Password must be at least 6 characters" }); return; }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({
            name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword,
            userType: "doctor", fullName: fullName.trim(), specialization: specialization.trim(),
            yearsOfExperience: parseInt(yearsOfExperience) || 0,
            contactDetails: { email: contactDetails?.email || email.toLowerCase().trim(), phone: contactDetails?.phone || "" },
            profilePictureUrl: profilePictureUrl || "", availability: availability || [], isVerified: true,
        });
        await newUser.save();

        res.status(201).json({
            success: true, message: "Doctor registration successful",
            data: { user: { id: newUser._id, name: newUser.name, email: newUser.email, userType: newUser.userType, fullName: newUser.fullName, specialization: newUser.specialization, yearsOfExperience: newUser.yearsOfExperience, contactDetails: newUser.contactDetails, profilePictureUrl: newUser.profilePictureUrl, availability: newUser.availability } },
        });
    } catch (error: any) {
        if (error.code === 11000) { res.status(400).json({ success: false, message: "A user with this email already exists" }); return; }
        console.error("Doctor signup error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const doctorLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        if (!email || !password) { res.status(400).json({ success: false, message: "Please provide email and password" }); return; }

        const user = await User.findOne({ email: email.toLowerCase(), userType: "doctor" }).select("+password");
        if (!user) { res.status(401).json({ success: false, message: "Invalid email or password" }); return; }

        const isValid = await bcrypt.compare(password, user.password!);
        if (!isValid) { res.status(401).json({ success: false, message: "Invalid email or password" }); return; }

        const token = generateToken({ id: user._id, username: user.email, role: "doctor" });
        res.status(200).json({
            success: true, message: "Login successful",
            data: { token, user: { id: user._id, name: user.name, email: user.email, userType: user.userType, fullName: user.fullName, specialization: user.specialization, yearsOfExperience: user.yearsOfExperience, contactDetails: user.contactDetails, profilePictureUrl: user.profilePictureUrl, availability: user.availability } },
        });
    } catch (error) {
        console.error("Doctor login error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const createDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
        const doctor = new User({ ...req.body, userType: "doctor", name: req.body.fullName });
        await doctor.save();
        res.status(201).json({ success: true, doctor });
    } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const getDoctors = async (_req: Request, res: Response): Promise<void> => {
    try {
        const doctors = await User.find({ userType: "doctor" });
        res.json({ success: true, doctors });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
    try {
        const doctor = await User.findOne({ _id: req.params.id, userType: "doctor" });
        if (!doctor) { res.status(404).json({ success: false, message: "Doctor not found" }); return; }
        if (doctor.availability && Array.isArray(doctor.availability)) {
            doctor.availability = doctor.availability.map((slot: any) => ({
                ...(slot.toObject ? slot.toObject() : slot),
                date: normalizeDate(slot.date),
            }));
        }
        res.json({ success: true, doctor });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const updateDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
        const doctor = await User.findOneAndUpdate({ _id: req.params.id, userType: "doctor" }, { ...req.body, name: req.body.fullName }, { new: true });
        if (!doctor) { res.status(404).json({ success: false, message: "Doctor not found" }); return; }
        res.json({ success: true, doctor });
    } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const updateDoctorProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData: any = { ...req.body, name: req.body.fullName };
        if (req.body.availability && Array.isArray(req.body.availability)) {
            updateData.availability = req.body.availability.map((slot: any) => ({ ...slot, date: normalizeDate(slot.date) }));
        }
        const doctor = await User.findOneAndUpdate({ _id: id, userType: "doctor" }, updateData, { new: true });
        if (!doctor) { res.status(404).json({ success: false, message: "Doctor not found" }); return; }
        res.json({ success: true, doctor });
    } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const changeDoctorPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) { res.status(400).json({ success: false, message: "Current and new password required" }); return; }
        if (newPassword.length < 6) { res.status(400).json({ success: false, message: "New password must be at least 6 characters" }); return; }

        const doctor = await User.findOne({ _id: id, userType: "doctor" }).select("+password");
        if (!doctor) { res.status(404).json({ success: false, message: "Doctor not found" }); return; }
        if (!doctor.password) { res.status(400).json({ success: false, message: "Password change not available" }); return; }

        const isValid = await bcrypt.compare(currentPassword, doctor.password);
        if (!isValid) { res.status(400).json({ success: false, message: "Current password is incorrect" }); return; }

        const hashed = await bcrypt.hash(newPassword, 12);
        await User.findByIdAndUpdate(id, { password: hashed });
        res.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

export const getDoctorPatients = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const response = await axios.get(`${APPOINTMENT_SERVICE_URL}/api/appointment/doctor/${id}`);
        const appointments = response.data.appointments || [];

        const patientMap = new Map<string, any>();
        appointments.forEach((appt: any) => {
            const pid = appt.patientId;
            if (!patientMap.has(pid)) {
                patientMap.set(pid, { _id: pid, name: appt.patientName, contact: appt.patientContact, address: appt.patientAddress, totalAppointments: 0, lastAppointment: null, nextAppointment: null, status: "active" });
            }
            const p = patientMap.get(pid)!;
            p.totalAppointments++;
            if (!p.lastAppointment || appt.date > p.lastAppointment) p.lastAppointment = appt.date;
            const ad = new Date(appt.date);
            if (ad > new Date() && (!p.nextAppointment || appt.date < p.nextAppointment)) p.nextAppointment = appt.date;
        });

        res.json({ success: true, patients: Array.from(patientMap.values()) });
    } catch (error: any) {
        console.error("Error fetching doctor patients:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
        const doctor = await User.findOneAndDelete({ _id: req.params.id, userType: "doctor" });
        if (!doctor) { res.status(404).json({ success: false, message: "Doctor not found" }); return; }
        res.json({ success: true, message: "Doctor deleted" });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};
