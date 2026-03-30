import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
  {
    billId: {
      type: String,
      required: true,
    },
    receiptNo: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "insurance", "government"],
      required: true,
    },
    stripePaymentIntentId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const PaymentTransaction = mongoose.model(
  "PaymentTransaction",
  paymentTransactionSchema
);

export default PaymentTransaction;
