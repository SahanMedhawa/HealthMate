import mongoose from "mongoose";

const governmentFundingSchema = new mongoose.Schema(
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
    programType: {
      type: String,
      required: true,
    },
    beneficiaryId: {
      type: String,
      required: true,
    },
    beneficiaryName: {
      type: String,
      required: true,
    },
    referenceNumber: {
      type: String,
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

const GovernmentFunding = mongoose.model("GovernmentFunding", governmentFundingSchema);

export default GovernmentFunding;
