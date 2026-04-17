import axios from 'axios';
import { sendConsultationReminderEmail } from './EmailService.js';
import Notification from '../models/notification.model.js';

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://appointment-service:5003";
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || "http://patient-service:5001";
const REMINDER_VERBOSE_LOGS = process.env.REMINDER_VERBOSE_LOGS === 'true';

// Set your local timezone (Sri Lanka is UTC+5:30)
const TIMEZONE_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

interface Appointment {
    _id?: string;
    patientId: string;
    doctorId?: string;
    doctorName?: string;
    date: string;
    time: string;
    status?: string;
}

export const startReminderScheduler = () => {
    console.log('🕐 Reminder scheduler started - checking every minute (Local Time)');
    
    const interval = setInterval(() => {
        checkAndSendReminders();
    }, 60 * 1000);
    
    process.on('SIGTERM', () => clearInterval(interval));
    process.on('SIGINT', () => clearInterval(interval));
    
    checkAndSendReminders();
};

function formatAxiosError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const method = error.config?.method?.toUpperCase() || 'GET';
        const url = error.config?.url || 'unknown-url';
        const status = error.response?.status;
        const code = error.code || 'UNKNOWN';
        const message = error.message || 'request failed';
        return `${method} ${url} failed (code=${code}${status ? `, status=${status}` : ''}): ${message}`;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function getLocalTime(): Date {
    // Get current UTC time and add offset to get local time
    const now = new Date();
    const localTime = new Date(now.getTime() + TIMEZONE_OFFSET);
    return localTime;
}

function parseAppointmentTime(timeStr: string): { hours: number; minutes: number } {
    let hours = 0, minutes = 0;
    
    // Handle "16:00" format (24-hour)
    const hourMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (hourMatch) {
        hours = parseInt(hourMatch[1]);
        minutes = parseInt(hourMatch[2]);
        return { hours, minutes };
    }
    
    // Handle "4:00 PM" format
    const pmMatch = timeStr.match(/(\d+):(\d+)\s*PM/i);
    if (pmMatch) {
        hours = parseInt(pmMatch[1]);
        minutes = parseInt(pmMatch[2]);
        if (hours !== 12) hours += 12;
        return { hours, minutes };
    }
    
    // Handle "10:00 AM" format
    const amMatch = timeStr.match(/(\d+):(\d+)\s*AM/i);
    if (amMatch) {
        hours = parseInt(amMatch[1]);
        minutes = parseInt(amMatch[2]);
        if (hours === 12) hours = 0;
        return { hours, minutes };
    }
    
    return { hours: -1, minutes: -1 };
}

async function checkAndSendReminders() {
    // Use local time instead of UTC
    const now = getLocalTime();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (REMINDER_VERBOSE_LOGS) {
        console.log(`[Reminder] Local time: ${now.toLocaleString()}, Checking at ${currentHour}:${currentMinute}...`);
    }
    
    try {
        // Get tomorrow's date in local time
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const response = await axios.get(`${APPOINTMENT_SERVICE_URL}/api/appointment`, {
            timeout: 10000
        });
        
        const allAppointments = response.data.data || response.data.appointments || response.data || [];
        const tomorrowAppointments = allAppointments.filter((apt: Appointment) => apt.date === tomorrowStr);
        
        for (const apt of tomorrowAppointments) {
            if (!apt.patientId || !apt.date || !apt.time) continue;
            if (apt.status === 'cancelled') continue;
            
            const { hours: aptHour, minutes: aptMinute } = parseAppointmentTime(apt.time);
            
            if (aptHour === -1) continue;
            
            // Check if current local time matches appointment time
            const timeMatches = (currentHour === aptHour && Math.abs(currentMinute - aptMinute) <= 1);
            
            if (timeMatches) {
                console.log(`[Reminder] ✅ TIME MATCH! Sending reminder for appointment at ${apt.time} (Local time: ${currentHour}:${currentMinute})`);
                
                const existingReminder = await Notification.findOne({
                    appointmentId: apt._id?.toString(),
                    type: 'reminder'
                });
                
                if (!existingReminder) {
                    try {
                        const patientRes = await axios.get(`${PATIENT_SERVICE_URL}/api/patient/public/user/${apt.patientId}`, {
                            timeout: 5000
                        });
                        const patientEmail = patientRes.data.user?.email;
                        const patientName = patientRes.data.user?.name;
                        
                        if (patientEmail) {
                            await sendConsultationReminderEmail(
                                patientEmail,
                                patientName || 'Patient',
                                apt.doctorName || 'Doctor',
                                apt.date,
                                apt.time
                            );
                            
                            await Notification.create({
                                type: 'reminder',
                                recipient: patientEmail,
                                recipientType: 'email',
                                status: 'sent',
                                subject: 'Appointment Reminder - 24 Hours',
                                content: `Reminder: You have an appointment with Dr. ${apt.doctorName} tomorrow at ${apt.time}`,
                                appointmentId: apt._id?.toString(),
                                patientId: apt.patientId,
                                doctorId: apt.doctorId,
                                appointmentDate: apt.date,
                                appointmentTime: apt.time,
                                sentAt: new Date()
                            });
                            
                            console.log(`[Reminder] ✅ Reminder sent!`);
                        }
                    } catch (err) {
                        console.error(`[Reminder] Failed: ${formatAxiosError(err)}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`[Reminder] Error: ${formatAxiosError(error)}`);
    }
}