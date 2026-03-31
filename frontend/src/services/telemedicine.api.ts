import api from '../api/client';

const BASE = '/telemedicine';

/* ───────────── Types ───────────── */

export type ConsultationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Consultation {
  id: number;
  appointmentId: string;
  doctorId: string;
  doctorName: string | null;
  patientId: string;
  patientName: string | null;
  roomId: string;
  joinLink: string;
  status: ConsultationStatus;
  scheduledAt: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultationData {
  appointmentId: string;
  patientId: string;
  patientName?: string;
  doctorName?: string;
  scheduledAt: string;
  notes?: string;
}

export interface UpdateStatusData {
  status: ConsultationStatus;
  notes?: string;
}

interface ApiRes<T> {
  success: boolean;
  message: string;
  data: T;
}

/* ───────────── API Functions ───────────── */

export const createConsultation = async (
  data: CreateConsultationData,
): Promise<Consultation> => {
  try {
    const res = await api.post<ApiRes<Consultation>>(`${BASE}/create`, data);
    return res.data.data;
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || 'Failed to create consultation session',
    );
  }
};

export const joinConsultation = async (
  appointmentId: string,
): Promise<Consultation> => {
  try {
    const res = await api.get<ApiRes<Consultation>>(
      `${BASE}/join/${appointmentId}`,
    );
    return res.data.data;
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || 'Failed to fetch consultation session',
    );
  }
};

export const updateConsultationStatus = async (
  appointmentId: string,
  data: UpdateStatusData,
): Promise<Consultation> => {
  try {
    const res = await api.patch<ApiRes<Consultation>>(
      `${BASE}/${appointmentId}/status`,
      data,
    );
    return res.data.data;
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || 'Failed to update consultation status',
    );
  }
};

export const getDoctorHistory = async (
  doctorId: string,
): Promise<Consultation[]> => {
  try {
    const res = await api.get<ApiRes<Consultation[]>>(
      `${BASE}/doctor/${doctorId}/history`,
    );
    return res.data.data;
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || 'Failed to fetch doctor history',
    );
  }
};

export const getPatientHistory = async (
  patientId: string,
): Promise<Consultation[]> => {
  try {
    const res = await api.get<ApiRes<Consultation[]>>(
      `${BASE}/patient/${patientId}/history`,
    );
    return res.data.data;
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || 'Failed to fetch patient history',
    );
  }
};
