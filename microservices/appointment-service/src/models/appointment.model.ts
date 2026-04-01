import mongoose, { Schema, Document } from "mongoose";

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  patientName: string;
  patientAddress: string;
  patientContact: string;
  doctorId: mongoose.Types.ObjectId;
  doctorName?: string;
  consultationFee?: number;
  date: string;
  time: string;
  status: "booked" | "in_session" | "completed" | "cancelled";
  paymentTransactionId?: mongoose.Types.ObjectId;
  queueNumber: number;
  notes?: string;
  cancellationReason?: string;
  cancelledBy?: "patient" | "doctor" | "admin";
  cancelledAt?: Date;
  rescheduledFrom?: { date: string; time: string };
  rescheduledReason?: string;
  rescheduledAt?: Date;
  // Virtual field — only available after .populate('paymentTransactionId')
  paymentTransaction?: any;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientName: { type: String, required: true },
    patientAddress: { type: String, required: true },
    patientContact: { type: String, required: true },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorName: { type: String },
    consultationFee: { type: Number },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["booked", "in_session", "completed", "cancelled"],
      default: "booked",
    },
    paymentTransactionId: { 
    type: mongoose.Schema.Types.ObjectId 
},
    queueNumber: { type: Number, required: true },
    notes: { type: String },
    cancellationReason: { type: String },
    cancelledBy: { type: String, enum: ["patient", "doctor", "admin"] },
    cancelledAt: { type: Date },
    // Fixed: each nested field must have its own `type` wrapper
    rescheduledFrom: {
      date: { type: String },
      time: { type: String },
    },
    rescheduledReason: { type: String },
    rescheduledAt: { type: Date },
  },
  {
    timestamps: true,
    virtuals: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Removed: the redundant virtual populate on paymentTransactionId.
// Since paymentTransactionId is already a direct ObjectId ref, populate it
// directly via .populate('paymentTransactionId') — no virtual needed.

// Removed: the unreliable paymentStatus virtual getter.
// Payment status should be read from the populated document after explicit
// .populate('paymentTransactionId') at the query level, e.g.:
//   const appt = await Appointment.findById(id).populate('paymentTransactionId');
//   const status = appt.paymentTransactionId?.status ?? 'pending';

export const Appointment = mongoose.model<IAppointment>(
  "Appointment",
  appointmentSchema
);