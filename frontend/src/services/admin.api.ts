import api from '../api/client';

// Use the global api instance instead of creating a specific one for admin
const adminApi = api;

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  userType: "patient" | "doctor";
  isVerified: boolean;
  fullName?: string;
  specialization?: string;
  yearsOfExperience?: number;
  contactDetails?: {
    email: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientAddress: string;
  patientContact: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  queueNumber: number;
  status: "booked" | "in_session" | "completed" | "cancelled";
  notes?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  userStats: {
    totalPatients: number;
    totalDoctors: number;
    activeDoctors: number;
  };
  appointmentStats: {
    total: number;
    today: number;
    pending: number;
    completed: number;
    cancelled: number;
    weekly: number;
    monthly: number;
  };
  recentAppointments: Appointment[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers?: number;
  totalAppointments?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UsersResponse {
  users: User[];
  pagination: PaginationInfo;
}

export interface AppointmentsResponse {
  appointments: Appointment[];
  pagination: PaginationInfo;
}

// Admin API functions

// Admin login
export const loginAdmin = async (credentials: {
  username: string;
  password: string;
}): Promise<ApiResponse<{ token: string; admin: any }>> => {
  try {
    const response = await adminApi.post("/admin/login", credentials);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || {
      success: false,
      message: "Network error occurred",
    };
  }
};

// Get admin profile
export const getAdminProfile = async (): Promise<ApiResponse> => {
  try {
    const response = await adminApi.get("/admin/profile");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || {
      success: false,
      message: "Network error occurred",
    };
  }
};

// Get all users with filters and pagination
export const getUsers = async (params: {
  userType?: "patient" | "doctor";
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<UsersResponse>> => {
  try {
    const response = await adminApi.get("/admin/users", { params });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || {
      success: false,
      message: "Network error occurred",
    };
  }
};

// Toggle user status (activate/deactivate)
export const toggleUserStatus = async (
  userId: string,
  isActive: boolean
): Promise<ApiResponse> => {
  try {
    const response = await adminApi.put(`/admin/users/${userId}/status`, {
      isActive,
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || {
      success: false,
      message: "Network error occurred",
    };
  }
};

// Get all appointments with filters and pagination
export const getAppointments = async (params: {
  doctorId?: string;
  patientId?: string;
  status?: string;
  date?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<ApiResponse<AppointmentsResponse>> => {
  try {
    const response = await adminApi.get("/admin/appointments", { params });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || {
      success: false,
      message: "Network error occurred",
    };
  }
};

// Cancel appointment (admin action)
export const cancelAppointment = async (
  appointmentId: string,
  reason: string
): Promise<ApiResponse> => {
  try {
    const response = await adminApi.put(
      `/admin/appointments/${appointmentId}/cancel`,
      { reason }
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || {
      success: false,
      message: "Network error occurred",
    };
  }
};

// Get dashboard statistics
export const getDashboardStats = async (): Promise<ApiResponse<DashboardStats>> => {
  try {
    const response = await adminApi.get("/admin/stats");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || {
      success: false,
      message: "Network error occurred",
    };
  }
};

export default adminApi;
