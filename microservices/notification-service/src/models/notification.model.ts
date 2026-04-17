import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    type: 'booking_confirmation' | 'reminder' | 'completion' | 'cancellation' | 'reschedule' | 'sms';
    recipient: string;
    recipientType: 'email' | 'phone';
    status: 'pending' | 'sent' | 'failed';
    subject?: string;
    content: string;
    appointmentId?: string;
    patientId?: string;
    doctorId?: string;
    patientName?: string;
    doctorName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    scheduledFor?: Date;
    sentAt?: Date;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
    type: { 
        type: String, 
        enum: ['booking_confirmation', 'reminder', 'completion', 'cancellation', 'reschedule', 'sms'], 
        required: true 
    },
    recipient: { 
        type: String, 
        required: true 
    },
    recipientType: { 
        type: String, 
        enum: ['email', 'phone'], 
        required: true,
        default: 'email'
    },
    status: { 
        type: String, 
        enum: ['pending', 'sent', 'failed'], 
        default: 'pending' 
    },
    subject: { 
        type: String 
    },
    content: { 
        type: String, 
        required: true 
    },
    appointmentId: { 
        type: String 
    },
    patientId: { 
        type: String 
    },
    doctorId: { 
        type: String 
    },
    patientName: { 
        type: String 
    },
    doctorName: { 
        type: String 
    },
    appointmentDate: { 
        type: String 
    },
    appointmentTime: { 
        type: String 
    },
    scheduledFor: { 
        type: Date 
    },
    sentAt: { 
        type: Date 
    },
    error: { 
        type: String 
    }
}, { 
    timestamps: true 
});

// Indexes for better query performance
notificationSchema.index({ status: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ patientId: 1 });
notificationSchema.index({ appointmentId: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ type: 1 });

export default mongoose.model<INotification>("Notification", notificationSchema);