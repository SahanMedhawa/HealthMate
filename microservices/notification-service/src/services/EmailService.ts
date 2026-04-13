import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

/*
export const sendVerificationEmail = async (email: string, verificationToken: string): Promise<void> => {
    const url = `${process.env.BASE_URL || "http://localhost:5001"}/api/auth/verify/${verificationToken}`;
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to: email,
        subject: "Verify Your HealthMate Account",
        html: `<div><h1>HealthMate</h1><a href="${url}">Verify Email</a></div>`,
    });
};

export const sendDoctorCredentialsEmail = async (email: string, tempPassword: string, fullName?: string): Promise<void> => {
    await transporter.sendMail({
        from: { name: "HealthMate Admin", address: process.env.EMAIL_USER || "" },
        to: email,
        subject: "Your HealthMate Doctor Account",
        html: `<div><h1>HealthMate</h1><p>Welcome ${fullName || ""}!</p><p>Password: ${tempPassword}</p></div>`,
    });
};
*/

// Helper function to format date
const formatDate = (dateString: string): string => {
    if (!dateString || dateString === 'Time TBD') return 'To be confirmed';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch {
        return dateString;
    }
};

// Helper function to format time
const formatTime = (timeString: string): string => {
    if (!timeString || timeString === 'Time TBD') return 'To be confirmed';
    return timeString;
};

// ========== PATIENT EMAILS ==========

export const sendBookingConfirmationEmail = async (
    to: string, 
    patientName: string, 
    doctorName: string, 
    appointmentDate: string, 
    appointmentTime: string, 
    appointmentId: string
): Promise<void> => {
    const formattedDate = formatDate(appointmentDate);
    const formattedTime = formatTime(appointmentTime);
    
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to,
        subject: "Appointment Confirmation - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Appointment Confirmed</h2>
                <p>Dear ${patientName},</p>
                <p>Your appointment has been successfully booked with <strong>Dr. ${doctorName}</strong>.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                    <p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${appointmentId}</p>
                </div>
                <p>Please arrive 10 minutes before your scheduled time.</p>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

export const sendConsultationReminderEmail = async (
    to: string, 
    patientName: string, 
    doctorName: string, 
    appointmentDate: string, 
    appointmentTime: string, 
    meetingLink?: string
): Promise<void> => {
    const formattedDate = formatDate(appointmentDate);
    const formattedTime = formatTime(appointmentTime);
    const joinLink = meetingLink || `${process.env.FRONTEND_URL || "http://localhost:5173"}/telemedicine`;
    
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to,
        subject: "Appointment Reminder - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">Appointment Reminder</h2>
                <p>Dear ${patientName},</p>
                <p>This is a reminder for your upcoming appointment with <strong>Dr. ${doctorName}</strong>.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                </div>
                <p>Please join 5 minutes before your scheduled time.</p>
                <a href="${joinLink}" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Join Consultation</a>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

export const sendConsultationCompletionEmail = async (
    to: string, 
    patientName: string, 
    doctorName: string, 
    appointmentDate: string, 
    prescriptionSummary?: string
): Promise<void> => {
    const formattedDate = formatDate(appointmentDate);
    const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/patient/medical-dashboard`;
    
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to,
        subject: "Consultation Summary - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8b5cf6;">Consultation Completed</h2>
                <p>Dear ${patientName},</p>
                <p>Your consultation with <strong>Dr. ${doctorName}</strong> on <strong>${formattedDate}</strong> has been completed.</p>
                ${prescriptionSummary ? `<p><strong>Prescription:</strong> ${prescriptionSummary}</p>` : ''}
                <p>Your medical records and prescriptions are now available in your dashboard.</p>
                <a href="${dashboardUrl}" style="background: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Medical Records</a>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

export const sendCancellationEmail = async (
    to: string, 
    patientName: string, 
    doctorName: string, 
    appointmentDate: string, 
    appointmentTime: string, 
    reason?: string
): Promise<void> => {
    const formattedDate = formatDate(appointmentDate);
    const formattedTime = formatTime(appointmentTime);
    
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to,
        subject: "Appointment Cancelled - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Appointment Cancelled</h2>
                <p>Dear ${patientName},</p>
                <p>Your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong> has been cancelled.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>You can book a new appointment at your convenience.</p>
                <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/doctorsdir" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Book New Appointment</a>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

export const sendRescheduleEmail = async (
    to: string, 
    patientName: string, 
    doctorName: string, 
    newDate: string, 
    newTime: string, 
    oldDate?: string, 
    oldTime?: string
): Promise<void> => {
    const formattedNewDate = formatDate(newDate);
    const formattedNewTime = formatTime(newTime);
    const formattedOldDate = oldDate ? formatDate(oldDate) : null;
    const formattedOldTime = oldTime ? formatTime(oldTime) : null;
    
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to,
        subject: "Appointment Rescheduled - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">Appointment Rescheduled</h2>
                <p>Dear ${patientName},</p>
                <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been rescheduled.</p>
                ${formattedOldDate && formattedOldTime ? `
                <div style="background: #fee2e2; padding: 10px; border-radius: 5px; margin: 10px 0; text-decoration: line-through; color: #6b7280;">
                    <p style="margin: 5px 0;"><strong>Previous:</strong> ${formattedOldDate} at ${formattedOldTime}</p>
                </div>
                ` : ''}
                <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <p style="margin: 5px 0;"><strong>New Date:</strong> ${formattedNewDate}</p>
                    <p style="margin: 5px 0;"><strong>New Time:</strong> ${formattedNewTime}</p>
                </div>
                <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/my-appointments" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Appointments</a>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

// ========== DOCTOR EMAILS ==========

export const sendDoctorAppointmentNotification = async (
    to: string, 
    doctorName: string, 
    patientName: string, 
    appointmentDate: string, 
    appointmentTime: string, 
    appointmentId: string
): Promise<void> => {
    const formattedDate = formatDate(appointmentDate);
    const formattedTime = formatTime(appointmentTime);
    
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to,
        subject: "New Appointment - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New Appointment Booked</h2>
                <p>Dear Dr. ${doctorName},</p>
                <p>A new appointment has been booked with you.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Patient:</strong> ${patientName}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                    <p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${appointmentId}</p>
                </div>
                <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/doctor/dashboard" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

export const sendDoctorConsultationCompletionEmail = async (
    to: string, 
    doctorName: string, 
    patientName: string, 
    appointmentDate: string
): Promise<void> => {
    const formattedDate = formatDate(appointmentDate);
    
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to,
        subject: "Consultation Completed - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #22c55e;">Consultation Completed</h2>
                <p>Dear Dr. ${doctorName},</p>
                <p>Your consultation with <strong>${patientName}</strong> on <strong>${formattedDate}</strong> has been completed.</p>
                <p>You can now issue prescriptions and view the consultation notes.</p>
                <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/doctor/dashboard" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Patient Records</a>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

// ========== VERIFICATION EMAILS ==========

export const sendVerificationEmail = async (email: string, verificationToken: string): Promise<void> => {
    const url = `${process.env.BASE_URL || "http://localhost:5001"}/api/auth/verify/${verificationToken}`;
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to: email,
        subject: "Verify Your Email - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Email Verification</h2>
                <p>Please click the link below to verify your email address.</p>
                <a href="${url}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

export const sendDoctorCredentialsEmail = async (email: string, tempPassword: string, fullName?: string): Promise<void> => {
    await transporter.sendMail({
        from: { name: "HealthMate Admin", address: process.env.EMAIL_USER || "" },
        to: email,
        subject: "Doctor Account Created - HealthMate",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Welcome to HealthMate</h2>
                <p>Dear Dr. ${fullName || 'Doctor'},</p>
                <p>Your doctor account has been created successfully.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
                </div>
                <p>Please change your password after your first login.</p>
                <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login Now</a>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">HealthMate - Your Health, Our Priority</p>
            </div>
        `,
    });
};

export { transporter };