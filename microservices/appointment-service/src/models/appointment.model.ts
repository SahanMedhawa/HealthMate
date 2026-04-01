import mongoose, { Schema, Document } from "mongoose";

export interface IAppointment extends Document {
    patientId: mongoose.Types.ObjectId;
    patientName: string;
    patientAddress: string;
    patientContact: string;
    doctorId: mongoose.Types.ObjectId;
    doctorName?: string;
    date: string;
    time: string;
    status: "booked" | "in_session" | "completed" | "cancelled";
    queueNumber: number;
    notes?: string;
    cancellationReason?: string;
    cancelledBy?: "patient" | "doctor" | "admin";
    cancelledAt?: Date;
    rescheduledFrom?: { date: string; time: string };
    rescheduledReason?: string;
    rescheduledAt?: Date;
}

const appointmentSchema = new Schema<IAppointment>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        patientName: { type: String, required: true },
        patientAddress: { type: String, required: true },
        patientContact: { type: String, required: true },
        doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        doctorName: { type: String },
        date: { type: String, required: true },
        time: { type: String, required: true },
        status: { type: String, enum: ["booked", "in_session", "completed", "cancelled"], default: "booked" },
        queueNumber: { type: Number, required: true },
        notes: { type: String },
        cancellationReason: { type: String },
        cancelledBy: { type: String, enum: ["patient", "doctor", "admin"] },
        cancelledAt: { type: Date },
        rescheduledFrom: { date: String, time: String },
        rescheduledReason: { type: String },
        rescheduledAt: { type: Date },
    },
    { timestamps: true }
);

export const Appointment = mongoose.model<IAppointment>("Appointment", appointmentSchema);
