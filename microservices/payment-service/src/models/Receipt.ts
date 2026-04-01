import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true, // This already creates an index - no need to index again
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    services: [
      {
        name: String,
        cost: Number,
        description: String,
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
    paymentIntentId: {
      type: String,
      required: false,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    paymentDate: {
      type: Date,
    },
    createdBy: {
      type: String,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔗 Virtual populate for payment details
receiptSchema.virtual("paymentDetails", {
  ref: "PaymentTransaction",
  localField: "paymentTransactionId",
  foreignField: "_id",
  justOne: true,
});


receiptSchema.index({ patientId: 1 });           // For queries by patient
receiptSchema.index({ appointmentId: 1 });       // For queries by appointment
receiptSchema.index({ status: 1 });              // For filtering by status
receiptSchema.index({ createdAt: -1 });          // For sorting by date
receiptSchema.index({ patientId: 1, status: 1 }); // Compound index for common queries


const Receipt = mongoose.model("Receipt", receiptSchema);
export default Receipt;