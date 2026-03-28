import mongoose, { Schema, Document } from "mongoose";

export interface IDrug {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    price: number;
}

export interface IDiagnosis extends Document {
    appointmentId: mongoose.Types.ObjectId;
    patientId: mongoose.Types.ObjectId;
    doctorId: mongoose.Types.ObjectId;
    diagnosis: string;
    symptoms: string;
    notes?: string;
    drugs: IDrug[];
    registrationFee: number;
    doctorFee: number;
    drugsCost: number;
    totalAmount: number;
    prescribedAt: Date;
}

const drugSchema = new Schema<IDrug>(
    {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const diagnosisSchema = new Schema<IDiagnosis>(
    {
        appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
        patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        diagnosis: { type: String, required: true, trim: true, maxlength: 1000 },
        symptoms: { type: String, required: true, trim: true, maxlength: 1000 },
        notes: { type: String, trim: true, maxlength: 2000 },
        drugs: { type: [drugSchema], default: [] },
        registrationFee: { type: Number, required: true, default: 0 },
        doctorFee: { type: Number, required: true, min: 0 },
        drugsCost: { type: Number, required: true, default: 0, min: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        prescribedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

diagnosisSchema.index({ appointmentId: 1 });
diagnosisSchema.index({ patientId: 1 });
diagnosisSchema.index({ doctorId: 1 });
diagnosisSchema.index({ prescribedAt: -1 });

// Calculate totals before save
diagnosisSchema.pre("save", function (next) {
    this.drugsCost = this.drugs.reduce((total, drug) => total + drug.price * drug.quantity, 0);
    this.totalAmount = this.registrationFee + this.doctorFee + this.drugsCost;
    next();
});

export default mongoose.model<IDiagnosis>("Diagnosis", diagnosisSchema);
