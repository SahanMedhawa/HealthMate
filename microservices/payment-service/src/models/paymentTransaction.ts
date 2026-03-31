import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentTransaction extends Document {
  billId: string;
  receiptNo: string;
  amount: number;
  paymentMethod: "card" | "insurance" | "government";
  stripePaymentIntentId?: string;
  status: "pending" | "succeeded" | "failed";
  appointmentId?: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  receiptId?: mongoose.Types.ObjectId;
  paymentType: "appointment" | "receipt" | "insurance" | "government";
  insuranceClaimId?: string;
  governmentFundingId?: string;
  metadata?: Map<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
  // Virtual fields
  appointment?: any;
  receipt?: any;
  // Methods
  isAppointmentPayment(): boolean;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    billId: {
      type: String,
      required: true,
      index: true,
    },
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "insurance", "government"],
      required: true,
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "pending",
      index: true,
    },
    // References to related entities
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: false,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiptId: {
      type: Schema.Types.ObjectId,
      ref: "Receipt",
      required: false,
      index: true,
    },
    paymentType: {
      type: String,
      enum: ["appointment", "receipt", "insurance", "government"],
      default: "receipt",
    },
    insuranceClaimId: {
      type: String,
      sparse: true,
    },
    governmentFundingId: {
      type: String,
      sparse: true,
    },
    metadata: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true,
    virtuals: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add virtual populate for appointment
paymentTransactionSchema.virtual('appointment', {
  ref: 'Appointment',
  localField: 'appointmentId',
  foreignField: '_id',
  justOne: true,
});

// Add virtual populate for receipt
paymentTransactionSchema.virtual('receipt', {
  ref: 'Receipt',
  localField: 'receiptId',
  foreignField: '_id',
  justOne: true,
});

// Instance method to check if payment is for appointment
paymentTransactionSchema.methods.isAppointmentPayment = function(this: IPaymentTransaction): boolean {
  return this.paymentType === 'appointment' && !!this.appointmentId;
};

// Instance method to check if payment is successful
paymentTransactionSchema.methods.isSuccessful = function(this: IPaymentTransaction): boolean {
  return this.status === 'succeeded';
};

// Instance method to check if payment is pending
paymentTransactionSchema.methods.isPending = function(this: IPaymentTransaction): boolean {
  return this.status === 'pending';
};

// Instance method to check if payment failed
paymentTransactionSchema.methods.isFailed = function(this: IPaymentTransaction): boolean {
  return this.status === 'failed';
};

// Static method to find appointment payments
paymentTransactionSchema.statics.findAppointmentPayments = function(appointmentId: string) {
  return this.find({ 
    appointmentId, 
    paymentType: 'appointment' 
  });
};

// Static method to find patient payments
paymentTransactionSchema.statics.findPatientPayments = function(patientId: string) {
  return this.find({ patientId });
};

// Static method to find successful payments
paymentTransactionSchema.statics.findSuccessfulPayments = function() {
  return this.find({ status: 'succeeded' });
};

const PaymentTransaction = mongoose.model<IPaymentTransaction>(
  "PaymentTransaction",
  paymentTransactionSchema
);

export default PaymentTransaction;