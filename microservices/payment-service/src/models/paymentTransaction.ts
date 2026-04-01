import mongoose, { Schema, Document, Model } from "mongoose";

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
  // Instance methods — all declared in interface
  isAppointmentPayment(): boolean;
  isSuccessful(): boolean;
  isPending(): boolean;
  isFailed(): boolean;
}

// Static methods interface for the model
export interface IPaymentTransactionModel extends Model<IPaymentTransaction> {
  findAppointmentPayments(appointmentId: string): mongoose.Query<IPaymentTransaction[], IPaymentTransaction>;
  findPatientPayments(patientId: string): mongoose.Query<IPaymentTransaction[], IPaymentTransaction>;
  findSuccessfulPayments(): mongoose.Query<IPaymentTransaction[], IPaymentTransaction>;
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

// Virtual populate for appointment
paymentTransactionSchema.virtual("appointment", {
  ref: "Appointment",
  localField: "appointmentId",
  foreignField: "_id",
  justOne: true,
});

// Virtual populate for receipt
paymentTransactionSchema.virtual("receipt", {
  ref: "Receipt",
  localField: "receiptId",
  foreignField: "_id",
  justOne: true,
});

// Instance methods
paymentTransactionSchema.methods.isAppointmentPayment = function (
  this: IPaymentTransaction
): boolean {
  return this.paymentType === "appointment" && !!this.appointmentId;
};

paymentTransactionSchema.methods.isSuccessful = function (
  this: IPaymentTransaction
): boolean {
  return this.status === "succeeded";
};

paymentTransactionSchema.methods.isPending = function (
  this: IPaymentTransaction
): boolean {
  return this.status === "pending";
};

paymentTransactionSchema.methods.isFailed = function (
  this: IPaymentTransaction
): boolean {
  return this.status === "failed";
};

// Static methods
paymentTransactionSchema.statics.findAppointmentPayments = function (
  appointmentId: string
) {
  return this.find({ appointmentId, paymentType: "appointment" });
};

paymentTransactionSchema.statics.findPatientPayments = function (
  patientId: string
) {
  return this.find({ patientId });
};

paymentTransactionSchema.statics.findSuccessfulPayments = function () {
  return this.find({ status: "succeeded" });
};

// Use the extended model interface so statics are typed
const PaymentTransaction = mongoose.model<
  IPaymentTransaction,
  IPaymentTransactionModel
>("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;