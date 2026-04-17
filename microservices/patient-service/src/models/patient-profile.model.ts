import mongoose, { Schema, Document } from 'mongoose';

// Medical Condition Interface
export interface IMedicalCondition {
    id: string;
    condition: string;
    diagnosisDate?: Date;
    status: 'active' | 'resolved' | 'chronic';
    severity?: 'mild' | 'moderate' | 'severe';
    notes?: string;
    diagnosedBy?: string;
    doctorName?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Surgery Interface
export interface ISurgery {
    id: string;
    procedure: string;
    date: Date;
    hospital: string;
    surgeon: string;
    anesthesia?: 'general' | 'local' | 'spinal';
    notes?: string;
}

// Medication Interface
export interface IMedication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    prescribedBy: string;
    doctorName: string;
    status: 'active' | 'completed' | 'discontinued';
    reason?: string;
}

// Family History Interface
export interface IFamilyHistory {
    id: string;
    relationship: string;
    condition: string;
    ageAtDiagnosis?: number;
    notes?: string;
}

// Lifestyle Info Interface
export interface ILifestyleInfo {
    smoking?: 'never' | 'former' | 'current';
    alcohol?: 'never' | 'occasional' | 'moderate' | 'heavy';
    exercise?: 'sedentary' | 'light' | 'moderate' | 'active';
    occupation?: string;
    dietaryRestrictions?: string[];
    sleepHours?: number;
    stressLevel?: 'low' | 'moderate' | 'high';
}

// Immunization Interface
export interface IImmunization {
    id: string;
    name: string;
    date: Date;
    administeredBy: string;
    batchNumber?: string;
    nextDueDate?: Date;
    notes?: string;
}

// Vital Signs Interface (for tracking)
export interface IVitalSign {
    id: string;
    date: Date;
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    bmi?: number;
    notes?: string;
}

// Medical Report Interface
export interface IMedicalReport {
    id: string;
    title: string;
    fileUrl: string;
    reportType?: string;
    description?: string;
    uploadedAt: Date;
    source?: 'doctor' | 'hospital' | 'patient_upload';
    category?: 'external_record' | 'lab_result' | 'imaging' | 'prescription_other' | 'insurance' | 'other';
    doctorId?: string;
    doctorName?: string;
}

// Prescription Interface
export interface IPrescription {
    id: string;
    doctorId: string;
    doctorName: string;
    appointmentId: string;
    medicines: Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions?: string;
    }>;
    diagnosis: string;
    notes?: string;
    issuedAt: Date;
    validUntil: Date;
}

// Document Request Interface
export interface IDocumentRequest {
    id: string;
    requestType: string;
    reason: string;
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    requestedAt: Date;
    completedAt?: Date;
    notes?: string;
}

// Main Patient Profile Interface
export interface IPatientProfile extends Document {
    userId: mongoose.Types.ObjectId;
    
    // Basic Information
    phoneNumber?: string;
    dateOfBirth?: Date;
    gender?: "male" | "female" | "other";
    bloodGroup?: string;
    
    // Address
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    
    // Emergency Contact
    emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
    };
    
    // Medical History (Enhanced)
    medicalConditions: IMedicalCondition[];
    surgeries: ISurgery[];
    allergies: string[];
    chronicConditions: string[];
    currentMedications: IMedication[];
    pastMedications: IMedication[];
    familyHistory: IFamilyHistory[];
    lifestyle: ILifestyleInfo;
    immunizations: IImmunization[];
    vitalSigns: IVitalSign[];
    
    // Documents
    medicalReports: IMedicalReport[];
    prescriptions: IPrescription[];
    
    // Requests
    documentRequests: IDocumentRequest[];
}

// Schema Definitions
const medicalConditionSchema = new Schema<IMedicalCondition>({
    id: { type: String, required: true },
    condition: { type: String, required: true },
    diagnosisDate: { type: Date },
    status: { 
        type: String, 
        enum: ['active', 'resolved', 'chronic'],
        default: 'active'
    },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    notes: { type: String },
    diagnosedBy: { type: String },
    doctorName: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const surgerySchema = new Schema<ISurgery>({
    id: { type: String, required: true },
    procedure: { type: String, required: true },
    date: { type: Date, required: true },
    hospital: { type: String, required: true },
    surgeon: { type: String, required: true },
    anesthesia: { type: String, enum: ['general', 'local', 'spinal'] },
    notes: { type: String }
});

const medicationSchema = new Schema<IMedication>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    prescribedBy: { type: String, required: true },
    doctorName: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['active', 'completed', 'discontinued'],
        default: 'active'
    },
    reason: { type: String }
});

const familyHistorySchema = new Schema<IFamilyHistory>({
    id: { type: String, required: true },
    relationship: { type: String, required: true },
    condition: { type: String, required: true },
    ageAtDiagnosis: { type: Number },
    notes: { type: String }
});

const lifestyleSchema = new Schema<ILifestyleInfo>({
    smoking: { type: String, enum: ['never', 'former', 'current'] },
    alcohol: { type: String, enum: ['never', 'occasional', 'moderate', 'heavy'] },
    exercise: { type: String, enum: ['sedentary', 'light', 'moderate', 'active'] },
    occupation: { type: String },
    dietaryRestrictions: [{ type: String }],
    sleepHours: { type: Number },
    stressLevel: { type: String, enum: ['low', 'moderate', 'high'] }
});

const immunizationSchema = new Schema<IImmunization>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    administeredBy: { type: String, required: true },
    batchNumber: { type: String },
    nextDueDate: { type: Date },
    notes: { type: String }
});

const vitalSignSchema = new Schema<IVitalSign>({
    id: { type: String, required: true },
    date: { type: Date, default: Date.now },
    bloodPressure: { type: String },
    heartRate: { type: Number },
    temperature: { type: Number },
    respiratoryRate: { type: Number },
    oxygenSaturation: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    bmi: { type: Number },
    notes: { type: String }
});

const medicalReportSchema = new Schema<IMedicalReport>({
    id: { type: String, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    reportType: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now },
    source: { 
        type: String, 
        enum: ['doctor', 'hospital', 'patient_upload'],
        default: 'patient_upload'
    },
    category: {
        type: String,
        enum: ['external_record', 'lab_result', 'imaging', 'prescription_other', 'insurance', 'other'],
        default: 'external_record'
    },
    doctorId: { type: String },
    doctorName: { type: String }
});

const prescriptionSchema = new Schema<IPrescription>({
    id: { type: String, required: true },
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    appointmentId: { type: String, required: true },
    medicines: [{
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String
    }],
    diagnosis: { type: String, required: true },
    notes: String,
    issuedAt: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true }
});

const documentRequestSchema = new Schema<IDocumentRequest>({
    id: { type: String, required: true },
    requestType: { type: String, required: true },
    reason: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'rejected'],
        default: 'pending'
    },
    requestedAt: { type: Date, default: Date.now },
    completedAt: Date,
    notes: String
});

// Main Patient Profile Schema
const patientProfileSchema = new Schema<IPatientProfile>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    
    // Basic Information
    phoneNumber: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    bloodGroup: { type: String },
    
    // Address
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    
    // Emergency Contact
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },
    
    // Medical History (Enhanced)
    medicalConditions: [medicalConditionSchema],
    surgeries: [surgerySchema],
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    currentMedications: [medicationSchema],
    pastMedications: [medicationSchema],
    familyHistory: [familyHistorySchema],
    lifestyle: lifestyleSchema,
    immunizations: [immunizationSchema],
    vitalSigns: [vitalSignSchema],
    
    // Documents
    medicalReports: [medicalReportSchema],
    prescriptions: [prescriptionSchema],
    
    // Requests
    documentRequests: [documentRequestSchema]
    
}, { timestamps: true });

// Indexes for better query performance
patientProfileSchema.index({ userId: 1 });
patientProfileSchema.index({ 'medicalConditions.status': 1 });
patientProfileSchema.index({ 'currentMedications.status': 1 });

export default mongoose.model<IPatientProfile>("PatientProfile", patientProfileSchema);