import { Request, Response } from "express";
import Stripe from "stripe";
import PaymentTransaction from "../models/paymentTransaction.js";
import axios from "axios";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

// Initialize Stripe
let stripe: Stripe | null;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
  console.log("✅ Stripe initialized successfully");
} catch (error: any) {
  console.error("❌ Stripe initialization failed:", error.message);
  stripe = null;
}

// Utility to clean environment URLs
const cleanUrl = (rawUrl: string | undefined): string => {
  if (!rawUrl) return "";
  return String(rawUrl).trim().replace(/^[=\s"']+/, "").replace(/[=\s"']+$/, "").replace(/\/$/, "");
};

// Get service URLs from environment
const getServiceUrls = () => {
  const appointmentService = cleanUrl(process.env.APPOINTMENT_SERVICE_URL) || "http://healthmate-appointment:5003";
  const userService = cleanUrl(process.env.USER_SERVICE_URL) || "http://healthmate-patient:5001";
  const receiptService = cleanUrl(process.env.RECEIPT_SERVICE_URL) || "http://healthmate-payment:5008";

  console.log("📍 Service URLs:");
  console.log(`  - Appointment: ${appointmentService}`);
  console.log(`  - User: ${userService}`);
  console.log(`  - Receipt: ${receiptService}`);

  return { appointmentService, userService, receiptService };
};

// 🔐 Generate service-to-service token
const generateServiceToken = (): string => {
  const JWT_SECRET = process.env.JWT_SECRET || "meditrack_jwt_secret_key_2024";
  const servicePayload = {
    id: "payment-service",
    username: "payment-service",
    role: "system",
    service: true,
  };
  return jwt.sign(servicePayload, JWT_SECRET, { expiresIn: "1h" });
};

// 🔐 Extract user info from incoming request token
const extractUserFromToken = (authHeader: string | undefined): any => {
  try {
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    const JWT_SECRET = process.env.JWT_SECRET || "meditrack_jwt_secret_key_2024";
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.warn("⚠️ Could not extract user from token:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
};

export const paymentController = {
  // 💳 Create PaymentIntent
  createPaymentIntent: async (req: Request, res: Response): Promise<void> => {
    if (!stripe) {
      res.status(500).json({
        message: "Payment service unavailable - Stripe not configured",
        error: "Stripe secret key missing",
      });
      return;
    }

    const { amount, billId, receiptNo, paymentType, appointmentId, patientId, receiptId } = req.body;

    if (!patientId) {
      res.status(400).json({ message: "patientId is required" });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({ message: "Valid amount is required" });
      return;
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        metadata: {
          billId: billId || "",
          receiptNo: receiptNo || "",
          paymentType: paymentType || "receipt",
          appointmentId: appointmentId || "",
          patientId: patientId || "",
        },
        automatic_payment_methods: { enabled: true },
      });

      const transaction = new PaymentTransaction({
        billId: billId || null,
        receiptNo: receiptNo || null,
        amount,
        paymentMethod: "card",
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
        paymentType: paymentType || "receipt",
        appointmentId: appointmentId || null,
        patientId,
        receiptId: receiptId || null,
        metadata: {
          billId: billId || "",
          receiptNo: receiptNo || "",
          paymentType: paymentType || "receipt",
          appointmentId: appointmentId || "",
        },
      });

      await transaction.save();

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        transactionId: transaction._id,
      });
    } catch (error: any) {
      console.error("Stripe payment intent error:", error);
      res.status(500).json({
        message: "Payment intent creation failed",
        error: error.message,
      });
    }
  },

  // 💳 Confirm Payment
  confirmPayment: async (req: Request, res: Response): Promise<void> => {
    if (!stripe) {
      res.status(500).json({
        message: "Payment service unavailable - Stripe not configured",
        error: "Stripe secret key missing",
      });
      return;
    }

    const { paymentIntentId, billId, paymentType, appointmentId } = req.body;
    const urls = getServiceUrls();
    
    // 🔐 Use service-to-service token instead of user token
    const serviceToken = generateServiceToken();
    const userInfo = extractUserFromToken(req.headers.authorization);

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        res.status(400).json({
          success: false,
          message: "Payment not completed",
          status: paymentIntent.status,
        });
        return;
      }

      // ----- UPDATE TRANSACTION FIRST -----
      try {
        await PaymentTransaction.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntentId },
          { status: "succeeded", completedAt: new Date() }
        );
        console.log(`✅ Transaction ${paymentIntentId} updated to succeeded`);
      } catch (txErr: any) {
        console.error("❌ Failed to update transaction:", txErr.message);
      }

      // ----- APPOINTMENT PAYMENT -----
      if (paymentType === "appointment" && appointmentId) {
        const appointmentUrl = `${urls.appointmentService}/api/appointments/${appointmentId}/payment-status`;
        try {
          console.log(`🔄 Updating appointment ${appointmentId} payment status...`);
          await axios.patch(
            appointmentUrl,
            { 
              paymentStatus: "Paid",
            },
            { 
              headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${serviceToken}`,
                "X-Service": "payment-service",
              }, 
              timeout: 10000 
            }
          );
          console.log(`✅ Appointment ${appointmentId} payment status updated to Paid`);
        } catch (err: any) {
          console.error(
            `❌ Appointment update failed:`,
            err.response?.status,
            err.response?.data || err.message
          );
        }

        // Update receipt for appointment (non-fatal)
        try {
          console.log(`🔄 Updating receipt for appointment ${appointmentId}...`);
          const receiptUrl = `${urls.receiptService}/api/receipts/by-appointment/${appointmentId}`;
          await axios.patch(
            receiptUrl,
            { 
              status: "Paid",
              paymentDate: new Date().toISOString(),
            },
            { 
              headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${serviceToken}`,
                "X-Service": "payment-service",
              }, 
              timeout: 10000 
            }
          );
          console.log(`✅ Receipt for appointment ${appointmentId} updated to Paid`);
        } catch (err: any) {
          console.warn(
            `⚠️ Receipt update failed (non-fatal):`,
            err.response?.status,
            err.response?.data || err.message
          );
        }
      } else if (billId) {
        // ----- REGULAR RECEIPT PAYMENT -----
        const receiptUrl = `${urls.receiptService}/api/receipts/${billId}`;
        try {
          console.log(`🔄 Updating receipt ${billId} payment status...`);
          await axios.patch(
            receiptUrl,
            { 
              status: "Paid", 
              paymentDate: new Date().toISOString() 
            },
            { 
              headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${serviceToken}`,
                "X-Service": "payment-service",
              }, 
              timeout: 10000 
            }
          );
          console.log(`✅ Receipt ${billId} updated to Paid`);
        } catch (err: any) {
          console.error(
            `❌ Receipt update failed:`,
            err.response?.status,
            err.response?.data || err.message
          );
        }
      }

      res.json({
        success: true,
        message: "Payment confirmed successfully",
        data: {
          paymentIntentId,
          transactionStatus: "succeeded",
          paymentType,
          ...(appointmentId && { appointmentId }),
          ...(billId && { billId }),
        },
      });
    } catch (err: any) {
      console.error("Stripe payment confirmation error:", err);
      res.status(500).json({ 
        message: "Payment confirmation failed", 
        error: err.message 
      });
    }
  },

  // 🔵 Get all transactions for a patient
  getTransactionsByPatient: async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const transactions = await PaymentTransaction.find({ patientId }).sort({ createdAt: -1 });
      res.status(200).json(transactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔵 Get transaction by appointment ID
  getTransactionByAppointmentId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId } = req.params;
      const transaction = await PaymentTransaction.findOne({ appointmentId });
      if (!transaction) {
        res.status(404).json({ message: "No payment found for this appointment" });
        return;
      }
      res.status(200).json(transaction);
    } catch (error: any) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🟡 Update transaction
  updateTransaction: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const updatedTransaction = await PaymentTransaction.findByIdAndUpdate(
        id,
        { status, notes, updatedAt: new Date() },
        { new: true }
      );
      if (!updatedTransaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      res.status(200).json(updatedTransaction);
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔴 Delete transaction
  deleteTransaction: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedTransaction = await PaymentTransaction.findByIdAndDelete(id);
      if (!deletedTransaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      res.status(200).json({ message: "Transaction deleted successfully", deletedTransaction });
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};