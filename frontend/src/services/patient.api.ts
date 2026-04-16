// frontend/src/services/patient.api.ts
import api from './api';

export interface MedicalReport {
  id: string;
  title: string;
  fileUrl: string;
  reportType?: string;
  description?: string;
  uploadedAt: Date;
  source?: string;
  category?: string;
  doctorId?: string;
  doctorName?: string;
}

export interface Prescription {
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

// New types for Medical Dashboard
export interface MedicalCondition {
  id: string;
  condition: string;
  diagnosisDate?: string;
  status: 'active' | 'resolved' | 'chronic';
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
  doctorName?: string;
}

export interface Surgery {
  id: string;
  procedure: string;
  date: string;
  hospital: string;
  surgeon: string;
  notes?: string;
}

export interface FamilyHistory {
  id: string;
  relationship: string;
  condition: string;
  ageAtDiagnosis?: number;
  notes?: string;
}

export interface LifestyleInfo {
  smoking?: 'never' | 'former' | 'current';
  alcohol?: 'never' | 'occasional' | 'moderate' | 'heavy';
  exercise?: 'sedentary' | 'light' | 'moderate' | 'active';
  occupation?: string;
  dietaryRestrictions?: string[];
  sleepHours?: number;
  stressLevel?: 'low' | 'moderate' | 'high';
}

export interface Diagnosis {
  id: string;
  appointmentId: string;
  diagnosis: string;
  symptoms: string[];
  notes?: string;
  prescribedAt: Date;
  drugs: Array<{
    name: string;
    dosage: string;
    quantity: number;
    price: number;
    instructions?: string;
  }>;
  totalAmount: number;
}

export interface DoctorPrescription {
  id: string;
  diagnosisId: string;
  medicineName: string;
  dosage: string;
  quantity: number;
  price: number;
  instructions?: string;
  prescribedAt: Date;
  diagnosis: string;
}

export interface MedicalOverview {
  patientInfo: {
    id: string;
    name: string;
    email: string;
    photoURL?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
  };
  medicalHistory: {
    conditions: MedicalCondition[];
    allergies: string[];
    surgeries: Surgery[];
    chronicConditions: string[];
    familyHistory: FamilyHistory[];
    lifestyle: LifestyleInfo;
    immunizations: any[];
  };
  diagnoses: Diagnosis[];
  prescriptions: DoctorPrescription[];
  statistics: {
    totalDiagnoses: number;
    totalPrescriptions: number;
    totalMedicalReports: number;
    medicalConditionsCount: number;
    allergiesCount: number;
    lastVisit: string | null;
  };
}

export interface PatientProfile {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  chronicConditions?: string[];
  photoURL?: string;
  userType: string;
}

export interface PatientStats {
  totalMedicalReports: number;
  totalPrescriptions: number;
  activePrescriptions: number;
  medicalHistoryCount: number;
  allergiesCount: number;
}

export interface Allergy {
  id?: string;
  type: 'food' | 'drug' | 'dust' | 'pollen' | 'animal' | 'insect' | 'latex' | 'other';
  name: string;
  severity?: 'mild' | 'moderate' | 'severe';
  reaction?: string;
  diagnosedDate?: string;
  notes?: string;
}

const patientAPI = {
  // Profile Management
  getCurrentUser: async () => {
    const response = await api.get('/patient/me');
    return response.data;
  },

  updateProfile: async (profileData: Partial<PatientProfile>) => {
    const response = await api.put('/patient/profile', profileData);
    return response.data;
  },

  // Medical Reports
  uploadMedicalReport: async (formData: FormData) => {
    const response = await api.post('/patient/medical-reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getMedicalReports: async () => {
    const response = await api.get('/patient/medical-reports');
    return response.data;
  },

  deleteMedicalReport: async (reportId: string) => {
    const response = await api.delete(`/patient/medical-reports/${reportId}`);
    return response.data;
  },

  // Medical History
  getMedicalHistory: async () => {
    const response = await api.get('/patient/medical-history');
    return response.data;
  },

  addMedicalCondition: async (data: { condition: string; diagnosisDate?: string; status?: string; severity?: string; notes?: string }) => {
    const response = await api.post('/patient/medical-history/conditions', data);
    return response.data;
  },

  updateMedicalCondition: async (conditionId: string, data: { status?: string; notes?: string; severity?: string }) => {
    const response = await api.put(`/patient/medical-history/conditions/${conditionId}`, data);
    return response.data;
  },

  deleteMedicalCondition: async (conditionId: string) => {
    const response = await api.delete(`/patient/medical-history/conditions/${conditionId}`);
    return response.data;
  },

  addAllergy: async (allergy: string) => {
    const response = await api.post('/patient/medical-history/allergies', { allergy });
    return response.data;
  },

  removeAllergy: async (allergy: string) => {
    const response = await api.delete(`/patient/medical-history/allergies/${encodeURIComponent(allergy)}`);
    return response.data;
  },

  addSurgery: async (data: { procedure: string; date: string; hospital: string; surgeon: string; notes?: string }) => {
    const response = await api.post('/patient/medical-history/surgeries', data);
    return response.data;
  },

  addFamilyHistory: async (data: { relationship: string; condition: string; ageAtDiagnosis?: number; notes?: string }) => {
    const response = await api.post('/patient/medical-history/family', data);
    return response.data;
  },

  updateLifestyle: async (data: LifestyleInfo) => {
    const response = await api.put('/patient/medical-history/lifestyle', data);
    return response.data;
  },

  // Medical Overview (Unified)
  getMedicalOverview: async (): Promise<{ success: boolean; data: MedicalOverview }> => {
    const response = await api.get('/patient/medical-overview');
    return response.data;
  },

  getPatientPrescriptions: async () => {
    const response = await api.get('/patient/prescriptions-list');
    return response.data;
  },

  getPatientDiagnoses: async () => {
    const response = await api.get('/patient/diagnoses-list');
    return response.data;
  },

  // Local Prescriptions
  getPrescriptions: async () => {
    const response = await api.get('/patient/prescriptions');
    return response.data;
  },

  getPrescriptionById: async (prescriptionId: string) => {
    const response = await api.get(`/patient/prescriptions/${prescriptionId}`);
    return response.data;
  },

  // Statistics
  getPatientStats: async () => {
    const response = await api.get('/patient/stats');
    return response.data;
  },

  // Account Management
  deleteAccount: async () => {
    const response = await api.delete('/patient/account');
    return response.data;
  },

  // Document Requests
  requestMedicalRecords: async (data: { recordType: string; dateRange: string; reason: string; hospitalName: string }) => {
    const response = await api.post('/patient/medical-records/request', data);
    return response.data;
  },

  getDocumentRequests: async () => {
    const response = await api.get('/patient/document-requests');
    return response.data;
  }
};

export default patientAPI;