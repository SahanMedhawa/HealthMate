import mongoose, { Schema, Document } from "mongoose";

export interface IQueue extends Document {
    doctorId: mongoose.Types.ObjectId;
    date: string;
    status: "active" | "paused";
    pausedAt?: Date;
    resumedAt?: Date;
    pauseReason?: string;
}

const queueSchema = new Schema<IQueue>(
    {
        doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        status: { type: String, enum: ["active", "paused"], default: "active" },
        pausedAt: { type: Date },
        resumedAt: { type: Date },
        pauseReason: { type: String, maxlength: 500 },
    },
    { timestamps: true }
);

queueSchema.index({ doctorId: 1, date: 1 }, { unique: true });
queueSchema.index({ doctorId: 1, status: 1 });
queueSchema.index({ date: 1, status: 1 });

export default mongoose.model<IQueue>("Queue", queueSchema);
