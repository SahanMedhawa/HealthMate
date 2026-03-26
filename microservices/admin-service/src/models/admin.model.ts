import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
    username: string;
    password: string;
    email: string;
    fullName: string;
    role: "admin";
    isActive: boolean;
    lastLogin?: Date;
}

const adminSchema = new Schema<IAdmin>(
    {
        username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
        password: { type: String, required: true, select: false },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        fullName: { type: String, required: true, trim: true, maxlength: 100 },
        role: { type: String, enum: ["admin"], required: true, default: "admin" },
        isActive: { type: Boolean, default: true },
        lastLogin: { type: Date },
    },
    { timestamps: true }
);

adminSchema.index({ username: 1 });
adminSchema.index({ email: 1 });
adminSchema.index({ isActive: 1 });

export default mongoose.model<IAdmin>("Admin", adminSchema);
