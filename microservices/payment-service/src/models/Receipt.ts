import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: String,
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    services: [
      {
        name: {
          type: String,
          required: true,
        },
        cost: {
          type: Number,
          required: true,
        },
      },
    ],
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Claim Pending", "Funding Pending", "Overdue"],
      default: "Pending",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Receipt = mongoose.model("Receipt", receiptSchema);

export default Receipt;
