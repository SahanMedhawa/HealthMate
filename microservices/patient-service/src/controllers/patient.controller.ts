import type { Request, Response } from "express";
import admin from "../config/firebase.js";
import User from "../models/user.model.js";
import { generateToken } from "../middleware/auth.middleware.js";
import { v4 as uuidv4 } from "uuid";
import PatientProfile from "../models/patient-profile.model.js";
import fs from 'fs';
import path from 'path';
import axios from 'axios';  // ✅ Make sure axios is installed

// Service URLs
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || "http://localhost:5002";
const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5003";

// ========== HELPER FUNCTIONS ==========

const getDiagnosesByPatient = async (patientId: string): Promise<any[]> => {
    try {
        const response = await axios.get(`${DOCTOR_SERVICE_URL}/api/diagnosis/patient/${patientId}`);
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching diagnoses from doctor service:', error);
        return [];
    }
};

// ========== EXISTING FUNCTIONS (Keep as is) ==========

export const firebaseLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken, uid, email, name, photoURL } = req.body;

        if (!idToken || !uid || !email) {
            res.status(400).json({ success: false, message: "Missing required Firebase data" });
            return;
        }

        try {
            await admin.auth().verifyIdToken(idToken);
        } catch {
            res.status(401).json({ success: false, message: "Invalid Firebase token" });
            return;
        }

        let user = await User.findOne({
            $or: [{ firebaseUid: uid }, { email: email.toLowerCase() }],
        });

        if (user) {
            user.firebaseUid = uid;
            user.photoURL = photoURL;
            if (!user.name && name) user.name = name;
            if (!user.userType) user.userType = "patient";
            await user.save();
        } else {
            user = new User({
                name: name || email.split("@")[0],
                email: email.toLowerCase(),
                userType: "patient",
                firebaseUid: uid,
                photoURL,
                isVerified: true,
            });
            await user.save();
        }

        if (user.userType === "patient") {
            let profile = await PatientProfile.findOne({ userId: user._id });
            if (!profile) {
                profile = new PatientProfile({ userId: user._id });
                await profile.save();
            }
        }

        const token = generateToken({
            id: user._id,
            username: user.email,
            role: user.userType || "patient",
        });

        res.status(200).json({
            success: true,
            message: "Firebase login successful",
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    userType: user.userType,
                    photoURL: user.photoURL,
                    firebaseUid: user.firebaseUid,
                },
            },
        });
    } catch (error) {
        console.error("Firebase login error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, message: "User ID is required" });
            return;
        }

        const user = await User.findById(id).select("name email photoURL profilePictureUrl userType");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                photoURL: user.photoURL,
                profilePictureUrl: user.profilePictureUrl,
                userType: user.userType,
            },
        });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getAllPatients = async (_req: Request, res: Response): Promise<void> => {
    try {
        const patients = await User.find({ userType: "patient" });
        res.status(200).json({ success: true, patients });
    } catch (error) {
        console.error("Get all patients error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ========== PROFILE MANAGEMENT ==========

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const user = await User.findById(userId).select("-__v");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        let patientProfile = null;
        if (user.userType === "patient") {
            patientProfile = await PatientProfile.findOne({ userId: user._id });
        }

        res.status(200).json({
            success: true,
            user: {
                ...user.toObject(),
                patientProfile
            }
        });
    } catch (error) {
        console.error("Get current user error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { name, phoneNumber, dateOfBirth, gender, bloodGroup, address, emergencyContact } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        if (name) user.name = name;
        await user.save();

        let profile = await PatientProfile.findOne({ userId: user._id });
        if (!profile) {
            profile = new PatientProfile({ userId: user._id });
        }

        if (phoneNumber) profile.phoneNumber = phoneNumber;
        if (dateOfBirth) profile.dateOfBirth = new Date(dateOfBirth);
        if (gender) profile.gender = gender;
        if (bloodGroup) profile.bloodGroup = bloodGroup;
        if (address) profile.address = { ...profile.address, ...address };
        if (emergencyContact) profile.emergencyContact = { ...profile.emergencyContact, ...emergencyContact };

        await profile.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: { ...user.toObject(), patientProfile: profile }
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ========== MEDICAL REPORTS ==========

export const uploadMedicalReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { title, reportType, description, category, source } = req.body;
        
        const file = (req as any).file;
        
        if (!file) {
            res.status(400).json({ success: false, message: "No file uploaded" });
            return;
        }

        if (!title) {
            res.status(400).json({ success: false, message: "Title is required" });
            return;
        }

        const fileUrl = `/uploads/medical-reports/${file.filename}`;

        const user = await User.findById(userId);
        if (!user || user.userType !== "patient") {
            res.status(404).json({ success: false, message: "Patient not found" });
            return;
        }

        let profile = await PatientProfile.findOne({ userId: user._id });
        if (!profile) {
            profile = new PatientProfile({ userId: user._id });
        }

        const newReport = {
            id: uuidv4(),
            title,
            fileUrl,
            reportType: reportType || 'other',
            description: description || '',
            uploadedAt: new Date(),
            source: source || 'patient_upload',
            category: category || 'external_record'
        };

        profile.medicalReports.push(newReport);
        await profile.save();

        res.status(201).json({
            success: true,
            message: "Medical report uploaded successfully",
            report: newReport
        });
    } catch (error) {
        console.error("Upload medical report error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getMedicalReports = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const profile = await PatientProfile.findOne({ userId });
        let reports = profile?.medicalReports || [];
        
        if (reports.length === 0) {
            const sampleReports = [
                {
                    id: 'sample-1',
                    title: 'Annual Physical Examination',
                    reportType: 'lab_report',
                    description: 'Complete blood count, cholesterol panel, and basic metabolic panel results - All values within normal range.',
                    fileUrl: '',
                    uploadedAt: new Date('2024-03-15'),
                    source: 'doctor',
                    doctorName: 'Dr. Sarah Johnson',
                    category: 'lab_result'
                },
                {
                    id: 'sample-2',
                    title: 'Blood Pressure Medication',
                    reportType: 'prescription',
                    description: 'Lisinopril 10mg - Take once daily for blood pressure management.',
                    fileUrl: '',
                    uploadedAt: new Date('2024-03-10'),
                    source: 'doctor',
                    doctorName: 'Dr. Michael Chen',
                    category: 'prescription_other'
                },
                {
                    id: 'sample-3',
                    title: 'Chest X-Ray',
                    reportType: 'imaging',
                    description: 'Chest X-ray results - Normal findings. No abnormalities detected.',
                    fileUrl: '',
                    uploadedAt: new Date('2024-02-28'),
                    source: 'doctor',
                    doctorName: 'Dr. Emily Rodriguez',
                    category: 'imaging'
                }
            ];
            res.status(200).json({ success: true, reports: sampleReports });
            return;
        }

        res.status(200).json({ success: true, reports });
    } catch (error) {
        console.error("Get medical reports error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const deleteMedicalReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { reportId } = req.params;

        if (reportId.startsWith('sample-')) {
            res.status(400).json({ success: false, message: "Sample reports cannot be deleted" });
            return;
        }

        const profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            res.status(404).json({ success: false, message: "Patient profile not found" });
            return;
        }

        const report = profile.medicalReports.find(r => r.id === reportId);
        if (report && report.fileUrl) {
            const filePath = path.join(__dirname, '../', report.fileUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        const reportIndex = profile.medicalReports.findIndex(r => r.id === reportId);
        if (reportIndex === -1) {
            res.status(404).json({ success: false, message: "Report not found" });
            return;
        }

        profile.medicalReports.splice(reportIndex, 1);
        await profile.save();

        res.status(200).json({ success: true, message: "Medical report deleted successfully" });
    } catch (error) {
        console.error("Delete medical report error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ========== MEDICAL HISTORY (ENHANCED) ==========

export const getMedicalHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        const user = await User.findById(userId);
        if (!user || user.userType !== "patient") {
            res.status(404).json({ success: false, message: "Patient not found" });
            return;
        }

        const profile = await PatientProfile.findOne({ userId: user._id });
        
        res.status(200).json({
            success: true,
            data: {
                medicalConditions: profile?.medicalConditions || [],
                surgeries: profile?.surgeries || [],
                allergies: profile?.allergies || [],
                chronicConditions: profile?.chronicConditions || [],
                currentMedications: profile?.currentMedications || [],
                pastMedications: profile?.pastMedications || [],
                familyHistory: profile?.familyHistory || [],
                lifestyle: profile?.lifestyle || {},
                immunizations: profile?.immunizations || [],
                vitalSigns: profile?.vitalSigns || []
            }
        });
    } catch (error) {
        console.error("Get medical history error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const addMedicalCondition = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { condition, diagnosisDate, status, severity, notes } = req.body;
        
        if (!condition) {
            res.status(400).json({ success: false, message: "Condition is required" });
            return;
        }
        
        let profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            profile = new PatientProfile({ userId });
        }
        
        const newCondition = {
            id: uuidv4(),
            condition,
            diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : undefined,
            status: status || 'active',
            severity,
            notes,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        profile.medicalConditions.push(newCondition);
        await profile.save();
        
        res.status(201).json({
            success: true,
            message: "Medical condition added successfully",
            data: newCondition
        });
    } catch (error) {
        console.error("Add medical condition error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const updateMedicalCondition = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { conditionId } = req.params;
        const { status, notes, severity } = req.body;
        
        const profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            res.status(404).json({ success: false, message: "Profile not found" });
            return;
        }
        
        const condition = profile.medicalConditions.find(c => c.id === conditionId);
        if (!condition) {
            res.status(404).json({ success: false, message: "Condition not found" });
            return;
        }
        
        if (notes) condition.notes = notes;
        if (status) condition.status = status;
        if (severity) condition.severity = severity;
        condition.updatedAt = new Date();
        
        await profile.save();
        
        res.status(200).json({
            success: true,
            message: "Medical condition updated successfully",
            data: condition
        });
    } catch (error) {
        console.error("Update medical condition error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const deleteMedicalCondition = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { conditionId } = req.params;
        
        const profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            res.status(404).json({ success: false, message: "Profile not found" });
            return;
        }
        
        const conditionIndex = profile.medicalConditions.findIndex(c => c.id === conditionId);
        if (conditionIndex === -1) {
            res.status(404).json({ success: false, message: "Condition not found" });
            return;
        }
        
        profile.medicalConditions.splice(conditionIndex, 1);
        await profile.save();
        
        res.status(200).json({
            success: true,
            message: "Medical condition deleted successfully"
        });
    } catch (error) {
        console.error("Delete medical condition error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const addAllergy = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { allergy } = req.body;
        
        if (!allergy) {
            res.status(400).json({ success: false, message: "Allergy is required" });
            return;
        }
        
        let profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            profile = new PatientProfile({ userId });
        }
        
        if (!profile.allergies.includes(allergy)) {
            profile.allergies.push(allergy);
            await profile.save();
        }
        
        res.status(201).json({
            success: true,
            message: "Allergy added successfully",
            allergies: profile.allergies
        });
    } catch (error) {
        console.error("Add allergy error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const removeAllergy = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { allergy } = req.params;
        
        const profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            res.status(404).json({ success: false, message: "Profile not found" });
            return;
        }
        
        profile.allergies = profile.allergies.filter(a => a !== decodeURIComponent(allergy));
        await profile.save();
        
        res.status(200).json({
            success: true,
            message: "Allergy removed successfully",
            allergies: profile.allergies
        });
    } catch (error) {
        console.error("Remove allergy error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const addSurgery = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { procedure, date, hospital, surgeon, anesthesia, notes } = req.body;
        
        if (!procedure || !date || !hospital || !surgeon) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }
        
        let profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            profile = new PatientProfile({ userId });
        }
        
        const newSurgery = {
            id: uuidv4(),
            procedure,
            date: new Date(date),
            hospital,
            surgeon,
            anesthesia,
            notes
        };
        
        profile.surgeries.push(newSurgery);
        await profile.save();
        
        res.status(201).json({
            success: true,
            message: "Surgery added successfully",
            data: newSurgery
        });
    } catch (error) {
        console.error("Add surgery error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const addFamilyHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { relationship, condition, ageAtDiagnosis, notes } = req.body;
        
        if (!relationship || !condition) {
            res.status(400).json({ success: false, message: "Relationship and condition are required" });
            return;
        }
        
        let profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            profile = new PatientProfile({ userId });
        }
        
        const newFamilyHistory = {
            id: uuidv4(),
            relationship,
            condition,
            ageAtDiagnosis,
            notes
        };
        
        profile.familyHistory.push(newFamilyHistory);
        await profile.save();
        
        res.status(201).json({
            success: true,
            message: "Family history added successfully",
            data: newFamilyHistory
        });
    } catch (error) {
        console.error("Add family history error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const updateLifestyle = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { smoking, alcohol, exercise, occupation, dietaryRestrictions, sleepHours, stressLevel } = req.body;
        
        let profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            profile = new PatientProfile({ userId });
        }
        
        profile.lifestyle = {
            ...profile.lifestyle,
            smoking,
            alcohol,
            exercise,
            occupation,
            dietaryRestrictions,
            sleepHours,
            stressLevel
        };
        
        await profile.save();
        
        res.status(200).json({
            success: true,
            message: "Lifestyle information updated successfully",
            data: profile.lifestyle
        });
    } catch (error) {
        console.error("Update lifestyle error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ========== MEDICAL OVERVIEW (Unified with Doctor Service) ==========

export const getMedicalOverview = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        const user = await User.findById(userId);
        if (!user || user.userType !== "patient") {
            res.status(404).json({ success: false, message: "Patient not found" });
            return;
        }
        
        const profile = await PatientProfile.findOne({ userId: user._id });
        
        // Fetch diagnoses from doctor service
        const diagnoses = await getDiagnosesByPatient(user._id.toString());
        
        // Extract prescriptions from diagnoses
        const prescriptions = diagnoses.flatMap((d: any) => 
            (d.drugs || []).map((drug: any) => ({
                id: `${d._id}_${drug.name}`,
                diagnosisId: d._id,
                appointmentId: d.appointmentId,
                doctorId: d.doctorId,
                diagnosis: d.diagnosis,
                prescribedAt: d.prescribedAt,
                medicineName: drug.name,
                dosage: drug.dosage,
                quantity: drug.quantity,
                price: drug.price,
                instructions: drug.instructions,
                status: 'active'
            }))
        );
        
        const stats = {
            totalDiagnoses: diagnoses.length,
            totalPrescriptions: prescriptions.length,
            totalMedicalReports: profile?.medicalReports?.length || 0,
            medicalConditionsCount: profile?.medicalConditions?.length || 0,
            allergiesCount: profile?.allergies?.length || 0,
            lastVisit: diagnoses.length > 0 ? diagnoses[0].prescribedAt : null
        };
        
        res.status(200).json({
            success: true,
            data: {
                patientInfo: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    photoURL: user.photoURL,
                    phoneNumber: profile?.phoneNumber,
                    dateOfBirth: profile?.dateOfBirth,
                    gender: profile?.gender,
                    bloodGroup: profile?.bloodGroup
                },
                medicalHistory: {
                    conditions: profile?.medicalConditions || [],
                    allergies: profile?.allergies || [],
                    surgeries: profile?.surgeries || [],
                    chronicConditions: profile?.chronicConditions || [],
                    familyHistory: profile?.familyHistory || [],
                    lifestyle: profile?.lifestyle || {},
                    immunizations: profile?.immunizations || []
                },
                diagnoses: diagnoses.map((d: any) => ({
                    id: d._id,
                    appointmentId: d.appointmentId,
                    diagnosis: d.diagnosis,
                    symptoms: d.symptoms,
                    notes: d.notes,
                    prescribedAt: d.prescribedAt,
                    drugs: d.drugs,
                    totalAmount: d.totalAmount
                })),
                prescriptions: prescriptions,
                statistics: stats
            }
        });
    } catch (error) {
        console.error("Get medical overview error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getPatientPrescriptions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        const user = await User.findById(userId);
        if (!user || user.userType !== "patient") {
            res.status(404).json({ success: false, message: "Patient not found" });
            return;
        }
        
        const diagnoses = await getDiagnosesByPatient(user._id.toString());
        
        const prescriptions = diagnoses.flatMap((d: any) => 
            (d.drugs || []).map((drug: any) => ({
                id: `${d._id}_${drug.name}`,
                diagnosisId: d._id,
                appointmentId: d.appointmentId,
                doctorId: d.doctorId,
                diagnosis: d.diagnosis,
                prescribedAt: d.prescribedAt,
                medicineName: drug.name,
                dosage: drug.dosage,
                quantity: drug.quantity,
                price: drug.price,
                instructions: drug.instructions,
                status: 'active'
            }))
        ).sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime());
        
        res.status(200).json({
            success: true,
            prescriptions,
            count: prescriptions.length
        });
    } catch (error) {
        console.error("Get prescriptions error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getPatientDiagnoses = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        const user = await User.findById(userId);
        if (!user || user.userType !== "patient") {
            res.status(404).json({ success: false, message: "Patient not found" });
            return;
        }
        
        const diagnoses = await getDiagnosesByPatient(user._id.toString());
        
        res.status(200).json({
            success: true,
            diagnoses: diagnoses.map((d: any) => ({
                id: d._id,
                appointmentId: d.appointmentId,
                diagnosis: d.diagnosis,
                symptoms: d.symptoms,
                notes: d.notes,
                prescribedAt: d.prescribedAt,
                drugs: d.drugs,
                totalAmount: d.totalAmount
            })),
            count: diagnoses.length
        });
    } catch (error) {
        console.error("Get diagnoses error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ========== PRESCRIPTIONS (Local) ==========

export const getPrescriptions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const profile = await PatientProfile.findOne({ userId });
        
        if (!profile) {
            res.status(200).json({ success: true, prescriptions: [] });
            return;
        }

        const prescriptions = profile.prescriptions.sort((a, b) => 
            b.issuedAt.getTime() - a.issuedAt.getTime()
        );

        res.status(200).json({ success: true, prescriptions });
    } catch (error) {
        console.error("Get prescriptions error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getPrescriptionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { prescriptionId } = req.params;

        const profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            res.status(404).json({ success: false, message: "Prescription not found" });
            return;
        }

        const prescription = profile.prescriptions.find(p => p.id === prescriptionId);
        if (!prescription) {
            res.status(404).json({ success: false, message: "Prescription not found" });
            return;
        }

        res.status(200).json({ success: true, prescription });
    } catch (error) {
        console.error("Get prescription error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ========== ACCOUNT MANAGEMENT ==========

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        if (user.userType !== "patient") {
            res.status(403).json({ 
                success: false, 
                message: "Only patient accounts can be deleted" 
            });
            return;
        }

        await User.deleteOne({ _id: userId });
        await PatientProfile.deleteOne({ userId: userId });
        
        res.status(200).json({
            success: true,
            message: "Account permanently deleted successfully"
        });
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ========== STATISTICS ==========

export const getPatientStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        const user = await User.findById(userId);
        if (!user || user.userType !== "patient") {
            res.status(404).json({ success: false, message: "Patient not found" });
            return;
        }

        const profile = await PatientProfile.findOne({ userId: user._id });
        
        // Updated to use new model fields (removed medicalHistory reference)
        const stats = {
            totalMedicalReports: profile?.medicalReports?.length || 0,
            totalPrescriptions: profile?.prescriptions?.length || 0,
            activePrescriptions: profile?.prescriptions?.filter(p => p.validUntil > new Date()).length || 0,
            medicalConditionsCount: profile?.medicalConditions?.length || 0,  // ✅ Changed from medicalHistory
            allergiesCount: profile?.allergies?.length || 0,
            surgeriesCount: profile?.surgeries?.length || 0,
            familyHistoryCount: profile?.familyHistory?.length || 0
        };

        res.status(200).json({ success: true, stats });
    } catch (error) {
        console.error("Get patient stats error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ========== DOCUMENT REQUESTS ==========

export const requestMedicalRecords = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { recordType, dateRange, reason, hospitalName } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        
        let profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            profile = new PatientProfile({ userId });
        }
        
        const newRequest = {
            id: uuidv4(),
            requestType: `${hospitalName} - ${recordType}`,
            reason: `${reason} (Date Range: ${dateRange || 'All records'})`,
            status: 'pending' as const,
            requestedAt: new Date()
        };
        
        if (!profile.documentRequests) {
            profile.documentRequests = [];
        }
        profile.documentRequests.push(newRequest);
        await profile.save();
        
        console.log('Medical records request received:', {
            requestId: newRequest.id,
            patientId: userId,
            patientEmail: user.email,
            patientName: user.name,
            hospitalName,
            recordType,
            dateRange,
            reason,
            requestedAt: new Date().toISOString()
        });
        
        res.status(200).json({
            success: true,
            message: "Request submitted successfully. You will be contacted within 48 hours.",
            requestId: newRequest.id
        });
    } catch (error) {
        console.error("Request medical records error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getDocumentRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        const profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            res.status(200).json({ success: true, requests: [] });
            return;
        }
        
        res.status(200).json({
            success: true,
            requests: profile.documentRequests || []
        });
    } catch (error) {
        console.error("Get document requests error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getUserByIdPublic = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, message: "User ID is required" });
            return;
        }

        const user = await User.findById(id).select("name email photoURL userType");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
            },
        });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};