import express from "express";
import { 
    firebaseLogin, 
    getUserById, 
    getAllPatients,
    getCurrentUser,
    updateProfile,
    uploadMedicalReport,
    getMedicalReports,
    deleteMedicalReport,
    getPrescriptions,
    getPrescriptionById,
    deleteAccount,
    getPatientStats,
    requestMedicalRecords,
    getDocumentRequests,
    // Medical History Controllers
    getMedicalHistory,
    addMedicalCondition,
    updateMedicalCondition,
    deleteMedicalCondition,
    addAllergy,
    removeAllergy,
    addSurgery,
    addFamilyHistory,
    updateLifestyle,
    // Medical Overview Controllers
    getMedicalOverview,
    getPatientPrescriptions,
    getPatientDiagnoses,
    getUserByIdPublic
} from "../controllers/patient.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// ========== PUBLIC ROUTES ==========
// POST /api/patient/firebase-login
router.post("/firebase-login", firebaseLogin);

router.get("/public/user/:id", getUserByIdPublic);

// ========== PROTECTED ROUTES (require authentication) ==========
router.use(authenticateToken);

// ========== USER MANAGEMENT ==========
// GET /api/patient/user/:id
router.get("/user/:id", getUserById);
router.get("/", getAllPatients);
router.get("/me", getCurrentUser);
router.put("/profile", updateProfile);

// ========== MEDICAL REPORTS ==========
router.post("/medical-reports", upload.single('file'), uploadMedicalReport);
router.get("/medical-reports", getMedicalReports);
router.delete("/medical-reports/:reportId", deleteMedicalReport);

// ========== MEDICAL RECORDS REQUESTS ==========
router.post("/medical-records/request", requestMedicalRecords);
router.get("/document-requests", getDocumentRequests);

// ========== PRESCRIPTIONS (Local) ==========
router.get("/prescriptions", getPrescriptions);
router.get("/prescriptions/:prescriptionId", getPrescriptionById);

// ========== STATISTICS ==========
router.get("/stats", getPatientStats);

// ========== ACCOUNT MANAGEMENT ==========
router.delete("/account", deleteAccount);

// ========== MEDICAL HISTORY (Enhanced) ==========

// Get complete medical history
router.get("/medical-history", getMedicalHistory);

// Medical Conditions
router.post("/medical-history/conditions", addMedicalCondition);
router.put("/medical-history/conditions/:conditionId", updateMedicalCondition);
router.delete("/medical-history/conditions/:conditionId", deleteMedicalCondition);

// Allergies
router.post("/medical-history/allergies", addAllergy);
router.delete("/medical-history/allergies/:allergy", removeAllergy);

// Surgeries
router.post("/medical-history/surgeries", addSurgery);

// Family History
router.post("/medical-history/family", addFamilyHistory);

// Lifestyle
router.put("/medical-history/lifestyle", updateLifestyle);

// ========== MEDICAL OVERVIEW (Unified with Doctor Service) ==========

// Complete medical dashboard (combines patient + doctor data)
router.get("/medical-overview", getMedicalOverview);

// Prescriptions from doctor service
router.get("/prescriptions-list", getPatientPrescriptions);

// Diagnoses from doctor service
router.get("/diagnoses-list", getPatientDiagnoses);

export default router;