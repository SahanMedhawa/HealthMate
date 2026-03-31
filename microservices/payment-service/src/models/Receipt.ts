// Receipt.ts (Updated)
import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    services: [{
      name: String,
      cost: Number,
      description: String,
    }],
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Claim Pending", "Funding Pending"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "partial"],
      default: "unpaid",
    },
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: false,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: false,
    },
    paymentDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Add virtual populate for payment details
receiptSchema.virtual('paymentDetails', {
  ref: 'PaymentTransaction',
  localField: 'paymentTransactionId',
  foreignField: '_id',
  justOne: true
});

const Receipt = mongoose.model("Receipt", receiptSchema);
export default Receipt;