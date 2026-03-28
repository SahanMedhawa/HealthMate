import api from '../api/client';

const API_URL = "/diagnosis";

// The auth token is now handled globally by the client.ts interceptor.


export interface Drug {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  price: number;
}

export interface Diagnosis {
  _id: string;
  appointmentId: string;
  patientId: {
    _id: string;
    name: string;
    email: string;
  };
  doctorId: {
    _id: string;
    name: string;
    email: string;
  };
  diagnosis: string;
  symptoms: string;
  notes?: string;
  drugs: Drug[];
  registrationFee: number;
  doctorFee: number;
  drugsCost: number;
  totalAmount: number;
  prescribedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDiagnosisData {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  symptoms: string;
  notes?: string;
  drugs: Drug[];
  doctorFee: number;
}

export interface RevenueStats {
  totalRevenue: number;
  totalRegistrationFees: number;
  totalDoctorFees: number;
  totalDrugsCost: number;
  totalDiagnoses: number;
  averagePerDiagnosis: number;
}

// Create a new diagnosis
export const createDiagnosis = async (data: CreateDiagnosisData): Promise<Diagnosis> => {
  try {
    const response = await api.post(API_URL, data);
    return response.data.data;
  } catch (error: any) {
    console.error('Diagnosis API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to create diagnosis");
  }
};

// Get diagnosis by appointment ID
export const getDiagnosisByAppointment = async (appointmentId: string): Promise<Diagnosis | null> => {
  try {
    const response = await api.get(`${API_URL}/appointment/${appointmentId}`);
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(error.response?.data?.message || "Failed to fetch diagnosis");
  }
};

// Get all diagnoses by doctor ID
export const getDiagnosesByDoctor = async (doctorId: string): Promise<Diagnosis[]> => {
  try {
    const response = await api.get(`${API_URL}/doctor/${doctorId}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch diagnoses");
  }
};

// Get all diagnoses by patient ID
export const getDiagnosesByPatient = async (patientId: string): Promise<Diagnosis[]> => {
  try {
    const response = await api.get(`${API_URL}/patient/${patientId}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch diagnoses");
  }
};

// Get all diagnoses (admin only)
export const getAllDiagnoses = async (): Promise<Diagnosis[]> => {
  try {
    const response = await api.get(API_URL);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch diagnoses");
  }
};

// Update diagnosis
export const updateDiagnosis = async (
  diagnosisId: string,
  data: Partial<CreateDiagnosisData>
): Promise<Diagnosis> => {
  try {
    const response = await api.put(`${API_URL}/${diagnosisId}`, data);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update diagnosis");
  }
};

// Get revenue statistics
export const getRevenueStats = async (params?: {
  doctorId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<RevenueStats> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.doctorId) queryParams.append("doctorId", params.doctorId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const response = await api.get(`${API_URL}/stats/revenue?${queryParams.toString()}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch revenue stats");
  }
};
