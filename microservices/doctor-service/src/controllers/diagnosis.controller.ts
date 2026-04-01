import type { Request, Response } from "express";
import Diagnosis from "../models/diagnosis.model.js";
import axios from "axios";

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5003";

export const createDiagnosis = async (req: Request, res: Response): Promise<void> => {
    try {
        const { appointmentId, patientId, doctorId, diagnosis, symptoms, notes, drugs, doctorFee } = req.body;
        if (!appointmentId || !patientId || !doctorId || !diagnosis || !symptoms || doctorFee === undefined) {
            res.status(400).json({ success: false, message: "Missing required fields" }); return;
        }

        const existing = await Diagnosis.findOne({ appointmentId });
        if (existing) { res.status(400).json({ success: false, message: "Diagnosis already exists for this appointment" }); return; }

        const drugsArray = drugs || [];
        const drugsCost = drugsArray.reduce((t: number, d: any) => t + d.price * d.quantity, 0);
        const registrationFee = 0;
        const totalAmount = registrationFee + doctorFee + drugsCost;

        const newDiagnosis = new Diagnosis({
            appointmentId, patientId, doctorId, diagnosis, symptoms, notes,
            drugs: drugsArray, registrationFee, doctorFee, drugsCost, totalAmount,
            prescribedAt: new Date(),
        });
        await newDiagnosis.save();

        // Update appointment status to completed
        try { await axios.put(`${APPOINTMENT_SERVICE_URL}/api/appointment/${appointmentId}`, { status: "completed" }); }
        catch (e: any) { console.warn("Failed to update appointment status:", e.message); }

        res.status(201).json({ success: true, message: "Diagnosis created successfully", data: newDiagnosis });
    } catch (error: any) {
        console.error("Error creating diagnosis:", error);
        res.status(500).json({ success: false, message: "Failed to create diagnosis", error: error.message });
    }
};

export const getDiagnosisByAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
        const diag = await Diagnosis.findOne({ appointmentId: req.params.appointmentId });
        if (!diag) { res.status(404).json({ success: false, message: "Diagnosis not found" }); return; }
        res.status(200).json({ success: true, data: diag });
    } catch (error: any) { res.status(500).json({ success: false, message: "Failed to fetch diagnosis", error: error.message }); }
};

export const getDiagnosesByDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
        const diagnoses = await Diagnosis.find({ doctorId: req.params.doctorId }).sort({ prescribedAt: -1 });
        res.status(200).json({ success: true, count: diagnoses.length, data: diagnoses });
    } catch (error: any) { res.status(500).json({ success: false, message: "Failed to fetch diagnoses", error: error.message }); }
};

export const getDiagnosesByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
        const diagnoses = await Diagnosis.find({ patientId: req.params.patientId }).sort({ prescribedAt: -1 });
        res.status(200).json({ success: true, count: diagnoses.length, data: diagnoses });
    } catch (error: any) { res.status(500).json({ success: false, message: "Failed to fetch diagnoses", error: error.message }); }
};

export const getAllDiagnoses = async (_req: Request, res: Response): Promise<void> => {
    try {
        const diagnoses = await Diagnosis.find().sort({ prescribedAt: -1 });
        res.status(200).json({ success: true, count: diagnoses.length, data: diagnoses });
    } catch (error: any) { res.status(500).json({ success: false, message: "Failed to fetch diagnoses", error: error.message }); }
};

export const updateDiagnosis = async (req: Request, res: Response): Promise<void> => {
    try {
        const updated = await Diagnosis.findByIdAndUpdate(req.params.diagnosisId, req.body, { new: true, runValidators: true });
        if (!updated) { res.status(404).json({ success: false, message: "Diagnosis not found" }); return; }
        res.status(200).json({ success: true, message: "Diagnosis updated successfully", data: updated });
    } catch (error: any) { res.status(500).json({ success: false, message: "Failed to update diagnosis", error: error.message }); }
};

export const getRevenueStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, doctorId } = req.query;
        const query: any = {};
        if (startDate && endDate) {
            const start = new Date(startDate as string); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate as string); end.setHours(23, 59, 59, 999);
            query.prescribedAt = { $gte: start, $lte: end };
        }
        if (doctorId) query.doctorId = doctorId;

        const diagnoses = await Diagnosis.find(query);
        const stats = {
            totalDiagnoses: diagnoses.length,
            totalRegistrationFees: diagnoses.reduce((s, d) => s + d.registrationFee, 0),
            totalDoctorFees: diagnoses.reduce((s, d) => s + d.doctorFee, 0),
            totalDrugsCost: diagnoses.reduce((s, d) => s + d.drugsCost, 0),
            totalRevenue: diagnoses.reduce((s, d) => s + d.totalAmount, 0),
            averagePerDiagnosis: diagnoses.length > 0 ? diagnoses.reduce((s, d) => s + d.totalAmount, 0) / diagnoses.length : 0,
        };
        res.status(200).json({ success: true, data: stats });
    } catch (error: any) { res.status(500).json({ success: false, message: "Failed to calculate revenue stats", error: error.message }); }
};
