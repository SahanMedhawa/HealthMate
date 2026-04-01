import { Request, Response } from "express";
import Stripe from "stripe";
import PaymentTransaction from "../models/paymentTransaction.js";
import { receiptController } from "./receiptController.js";   // ← Only this import (fixed)
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

  // 💳 Confirm Payment - Fixed Version
  confirmPayment: async (req: Request, res: Response): Promise<void> => {
  if (!stripe) {
    res.status(500).json({ message: "Payment service unavailable" });
    return;
  }

  const { paymentIntentId, paymentType, appointmentId } = req.body;
  const urls = getServiceUrls();
  const serviceToken = generateServiceToken();

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      res.status(400).json({ success: false, message: "Payment not completed" });
      return;
    }

    // 1. Update local transaction status
    const transaction = await PaymentTransaction.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status: "succeeded", completedAt: new Date() },
      { new: true }
    );

    if (!transaction) {
      console.error("❌ Transaction not found for ID:", paymentIntentId);
      res.status(404).json({ message: "Transaction record not found" });
      return;
    }

    console.log(`✅ Transaction ${paymentIntentId} updated to succeeded. MongoID: ${transaction._id}`);

    // 2. Handle Appointment Payment + Receipt Creation
    if (paymentType === "appointment" && appointmentId) {
      
      let appointmentData = null;
      let patientData = null;
      
      try {
        console.log(`🔄 Fetching appointment details for ${appointmentId}...`);
        
        const appointmentResponse = await axios.get(
          `${urls.appointmentService}/api/appointment/${appointmentId}`,
          { 
            headers: { 
              "Authorization": `Bearer ${serviceToken}`,
              "X-Service": "payment-service",
            }, 
            timeout: 10000 
          }
        );
        
        appointmentData = appointmentResponse.data;
        
        const patientResponse = await axios.get(
          `${urls.userService}/api/patient/user/${appointmentData.patientId}`,
          { 
            headers: { 
              "Authorization": `Bearer ${serviceToken}`,
              "X-Service": "payment-service",
            }, 
            timeout: 10000 
          }
        );
        
        patientData = patientResponse.data.user || patientResponse.data;

        // === CREATE RECEIPT USING CONTROLLER DIRECTLY ===
        console.log(`🔄 Creating receipt for appointment ${appointmentId}...`);

        // Create a proper request object for the receipt controller
        const receiptRequest = {
          body: {
            receiptNo: `RCPT-${Date.now()}-${appointmentId.slice(-6)}`,
            patientId: appointmentData.patientId,
            patientName: patientData.name || patientData.fullName || "Unknown Patient",
            services: appointmentData.services || [{ name: "Appointment Fee", cost: transaction.amount }],
            total: transaction.amount,
            appointmentId: appointmentId,
            paymentIntentId: paymentIntentId,
            transactionId: transaction._id,
            status: "Paid",
            paymentStatus: "paid",
            paymentDate: new Date().toISOString()
          },
          params: {},
          query: {}
        } as Request;

        // Create a response object that captures the result
        let receiptResult: any = null;
        const receiptResponse = {
          status: (code: number) => ({
            json: (data: any) => {
              receiptResult = { status: code, data };
              return receiptResult;
            }
          }),
          json: (data: any) => {
            receiptResult = { status: 200, data };
            return receiptResult;
          }
        } as Response;

        // Call the receipt controller directly
        await receiptController.createReceipt(receiptRequest, receiptResponse);
        
        if (receiptResult && receiptResult.status === 201) {
          console.log(`✅ Receipt created successfully: ${receiptResult.data._id}`);
        } else {
          console.log(`⚠️ Receipt creation returned status: ${receiptResult?.status}`);
        }

      } catch (err: any) {
        console.error(`❌ Receipt creation failed:`, err.message);
        if (err.response) {
          console.error(`   Status: ${err.response.status} | Data:`, err.response.data);
        }
        // Don't fail the whole payment confirmation if receipt creation fails
        // But log it for monitoring
      }

      // 3. Update appointment payment status
      try {
        console.log(`🔄 Updating appointment ${appointmentId} payment status...`);
        await axios.patch(
          `${urls.appointmentService}/api/appointment/${appointmentId}/payment-status`,
          { 
            paymentTransactionId: transaction._id, 
            paymentStatus: "Paid" 
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
        console.log(`✅ Appointment ${appointmentId} updated successfully`);
      } catch (err: any) {
        console.error(`❌ Appointment update failed:`, err.response?.status, err.response?.data);
      }
    }

    // Final success response
    res.json({
      success: true,
      message: "Payment confirmed successfully",
      data: { 
        paymentIntentId, 
        transactionId: transaction._id 
      },
    });

  } catch (err: any) {
    console.error("Payment confirmation error:", err);
    res.status(500).json({ message: "Payment confirmation failed", error: err.message });
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