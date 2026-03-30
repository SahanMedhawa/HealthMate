import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    userType: "patient" | "doctor" | "admin";
    firebaseUid?: string;
    photoURL?: string;
    isVerified: boolean;
    fullName?: string;
    specialization?: string;
    yearsOfExperience?: number;
    contactDetails?: { email?: string; phone?: string };
    profilePictureUrl?: string;
    availability?: Array<{
        day: string;
        date: string;
        startTime: string;
        endTime: string;
        slots: number;
    }>;
    consultationFee?: number;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, select: false },
        userType: { type: String, enum: ["patient", "doctor", "admin"], required: true, default: "doctor" },
        firebaseUid: { type: String, unique: true, sparse: true },
        photoURL: { type: String },
        isVerified: { type: Boolean, default: false },
        fullName: { type: String, trim: true },
        specialization: { type: String, trim: true },
        yearsOfExperience: { type: Number, min: 0 },
        contactDetails: {
            email: { type: String, lowercase: true },
            phone: { type: String },
        },
        profilePictureUrl: { type: String },
        availability: [
            { day: String, date: String, startTime: String, endTime: String, slots: Number },
        ],
        consultationFee: { type: Number },
    },
    { timestamps: true }
);

userSchema.index({ userType: 1 });

export default mongoose.model<IUser>("User", userSchema);