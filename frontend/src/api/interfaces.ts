export interface UserData {
    id: string;
    name: string;
    email: string;
    userType: "patient" | "doctor" | "admin";
    photoURL?: string;
    firebaseUid?: string;
}

export interface DoctorAvailability {
    day: string;
    date: string;
    startTime: string;
    endTime: string;
    slots: number;
}

export interface DoctorData {
    _id?: string;
    fullName: string;
    specialization: string;
    yearsOfExperience: number;
    contactDetails: {
        email: string;
        phone: string;
    };
    profilePictureUrl?: string;
    availability: DoctorAvailability[];
}

export interface AppointmentData {
    _id: string;
    patientId: string;
    doctorId: string;
    doctorName?: string;
    patientName?: string;
    date: string;
    time: string;
    status: "scheduled" | "completed" | "cancelled" | "in-progress";
    queueNumber?: number;
    expectedTime?: string;
}

export interface DiagnosisData {
    _id?: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    date: string;
    symptoms: string[];
    diagnosis: string;
    prescription: Array<{
        medicineName: string;
        dosage: string;
        duration: string;
        instructions: string;
    }>;
    notes?: string;
    followUpDate?: string;
}

export interface QueueData {
    _id: string;
    doctorId: string;
    date: string;
    currentNumber: number;
    totalPatients: number;
    estimatedWaitTimePerPatient: number;
    isPaused: boolean;
}

export interface AdminData {
    _id: string;
    username: string;
    fullName: string;
    email: string;
    role: "admin";
    lastLogin?: string;
}

export interface FirebaseLoginData {
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
    idToken: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
}
