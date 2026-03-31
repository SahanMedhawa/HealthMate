import { Request, Response } from "express";
import Stripe from "stripe";
import Receipt from "../models/Receipt.js";
import PaymentTransaction from "../models/paymentTransaction.js";
import dotenv from "dotenv";

dotenv.config();

// Initialize Stripe with proper error handling
let stripe: Stripe | null;

try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log("✅ Stripe initialized successfully");
} catch (error: any) {
  console.error("❌ Stripe initialization failed:", error.message);
  stripe = null;
}

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

    const { amount, billId, receiptNo } = req.body;

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        metadata: { billId, receiptNo },
        automatic_payment_methods: { enabled: true },
      });

      const transaction = new PaymentTransaction({
        billId,
        receiptNo,
        amount,
        paymentMethod: "card",
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
      });

      await transaction.save();

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
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

    const { paymentIntentId, billId } = req.body;

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === "succeeded") {
        await Receipt.findByIdAndUpdate(billId, { status: "Paid" });

        await PaymentTransaction.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntentId },
          { status: "succeeded" }
        );

        res.json({ success: true, message: "Payment confirmed" });
      } else {
        res.status(400).json({
          success: false,
          message: "Payment not completed",
        });
      }
    } catch (error: any) {
      console.error("Stripe payment confirmation error:", error);
      res.status(500).json({
        message: "Payment confirmation failed",
        error: error.message,
      });
    }
  },

  // 🔵 READ - Payment Transaction by ID
  getTransactionById: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await PaymentTransaction.findById(req.params.id);
      if (!transaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      res.status(200).json(transaction);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔵 READ - Payment Transaction by Bill ID
  getTransactionByBillId: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await PaymentTransaction.findOne({
        billId: req.params.billId,
      });
      if (!transaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      res.status(200).json(transaction);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🟡 UPDATE Payment Transaction
  updateTransaction: async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, notes } = req.body;

      const updatedTransaction = await PaymentTransaction.findByIdAndUpdate(
        req.params.id,
        { status, notes, updatedAt: new Date() },
        { new: true }
      );

      if (!updatedTransaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      res.status(200).json(updatedTransaction);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔴 DELETE Payment Transaction
  deleteTransaction: async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedTransaction = await PaymentTransaction.findByIdAndDelete(
        req.params.id
      );

      if (!deletedTransaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      res.status(200).json({
        message: "Transaction deleted successfully",
        deletedTransaction,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};