import mongoose from "mongoose";

const insuranceClaimSchema = new mongoose.Schema(
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
    insuranceProvider: {
      type: String,
      required: true,
    },
    policyNumber: {
      type: String,
      required: true,
    },
    claimantName: {
      type: String,
      required: true,
    },
    claimantId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["submitted", "approved", "rejected", "processing"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  }
);

const InsuranceClaim = mongoose.model("InsuranceClaim", insuranceClaimSchema);

export default InsuranceClaim;
