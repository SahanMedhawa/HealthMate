import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export const sendVerificationEmail = async (email: string, verificationToken: string): Promise<void> => {
    const url = `${process.env.BASE_URL || "http://localhost:5001"}/api/auth/verify/${verificationToken}`;
    await transporter.sendMail({
        from: { name: "HealthMate", address: process.env.EMAIL_USER || "" },
        to: email,
        subject: "Verify Your HealthMate Account",
        html: `<div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;"><h1 style="color:#2563eb;">HealthMate</h1><p>Click below to verify your email:</p><a href="${url}" style="background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;">Verify Email</a></div>`,
    });
};

export const sendDoctorCredentialsEmail = async (email: string, tempPassword: string, fullName?: string): Promise<void> => {
    await transporter.sendMail({
        from: { name: "HealthMate Admin", address: process.env.EMAIL_USER || "" },
        to: email,
        subject: "Your HealthMate Doctor Account",
        html: `<div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;"><h1 style="color:#2563eb;">HealthMate</h1><h2>Welcome${fullName ? `, ${fullName}` : ""}!</h2><p>Email: ${email}</p><p>Temporary password: ${tempPassword}</p><p>Please change your password after first login.</p></div>`,
    });
};

export { transporter };
