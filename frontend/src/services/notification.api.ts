// frontend/src/services/notification.api.ts
const NOTIFICATION_API_URL = 'http://localhost:5006/api/notify';

export interface Notification {
  _id: string;
  type: string;
  recipient: string;
  recipientType: string;
  status: 'pending' | 'sent' | 'failed';
  subject?: string;
  content: string;
  appointmentId?: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

const notificationAPI = {
  // Get notification history for a patient
  getHistory: async (patientId: string, page: number = 1, limit: number = 20) => {
    const response = await fetch(`${NOTIFICATION_API_URL}/history/${patientId}?page=${page}&limit=${limit}`);
    return response.json();
  },

  // Get notification statistics
  getStats: async (patientId: string) => {
    const response = await fetch(`${NOTIFICATION_API_URL}/stats/${patientId}`);
    return response.json();
  },

  // Send a notification manually
  sendNotification: async (data: any) => {
    const response = await fetch(`${NOTIFICATION_API_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Resend a failed notification
  resendNotification: async (notificationId: string) => {
    const response = await fetch(`${NOTIFICATION_API_URL}/resend/${notificationId}`, {
      method: 'POST'
    });
    return response.json();
  },

  // Send booking confirmation (can be called from frontend)
  sendBookingConfirmation: async (data: {
    to: string;
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
    phoneNumber?: string;
  }) => {
    const response = await fetch(`${NOTIFICATION_API_URL}/booking-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Send SMS
  sendSMS: async (phoneNumber: string, message: string) => {
    const response = await fetch(`${NOTIFICATION_API_URL}/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, message })
    });
    return response.json();
  }
};

export default notificationAPI;