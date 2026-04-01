import { Request, Response } from "express";
import Receipt from "../models/Receipt.js";

export const receiptController = {

  createReceipt: async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        receiptNo, 
        patientId, 
        patientName, 
        services, 
        total,
        appointmentId,
        paymentIntentId,
        transactionId,
        status = "Paid",
        paymentStatus = "paid",
        paymentDate
      } = req.body;

      if (!receiptNo || !patientId || !patientName || !services || !total) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      const newReceipt = new Receipt({ 
        receiptNo, 
        patientId, 
        patientName, 
        services, 
        total,
        appointmentId: appointmentId || null,
        paymentIntentId: paymentIntentId || null,
        paymentTransactionId: transactionId || null,
        status,
        paymentStatus,
        paymentDate: paymentDate || new Date(),
      });

      const savedReceipt = await newReceipt.save();
      console.log(`✅ Receipt created successfully - ID: ${savedReceipt._id}`);
      
      res.status(201).json(savedReceipt);
    } catch (error: any) {
      console.error("❌ Receipt creation error:", error.message);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create receipt", 
        error: error.message 
      });
    }
  },

  // 🔵 READ - All receipts
  getAllReceipts: async (req: Request, res: Response): Promise<void> => {
    try {
      const receipts = await Receipt.find().sort({ createdAt: -1 });
      res.status(200).json(receipts);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔵 READ - Receipt by ID
  getReceiptById: async (req: Request, res: Response): Promise<void> => {
    try {
      const receipt = await Receipt.findById(req.params.id);
      if (!receipt) {
        res.status(404).json({ message: "Receipt not found" });
        return;
      }
      res.status(200).json(receipt);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔵 READ - Receipt by Bill ID
  getReceiptByBillId: async (req: Request, res: Response): Promise<void> => {
    try {
      const receipt = await Receipt.findOne({ receiptNo: req.params.billId });
      if (!receipt) {
        res.status(404).json({ message: "Receipt not found" });
        return;
      }
      res.status(200).json(receipt);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔵 READ - Receipts by patient ID
  getReceiptsByPatientId: async (req: Request, res: Response): Promise<void> => {
    try {
      const receipts = await Receipt.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
      if (!receipts.length) {
        res.status(404).json({ message: "No receipts found" });
        return;
      }
      res.status(200).json(receipts);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🟡 UPDATE Receipt
  updateReceipt: async (req: Request, res: Response): Promise<void> => {
    try {
      const { receiptNo, patientId, patientName, services, total, status } = req.body;
      const updatedReceipt = await Receipt.findByIdAndUpdate(
        req.params.id,
        { receiptNo, patientId, patientName, services, total, status },
        { new: true, runValidators: true }
      );
      if (!updatedReceipt) {
        res.status(404).json({ message: "Receipt not found" });
        return;
      }
      res.status(200).json(updatedReceipt);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🟡 UPDATE Receipt Payment Status
  updatePaymentStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { billId } = req.params;
      const { status, paymentDate } = req.body;

      const updatedReceipt = await Receipt.findOneAndUpdate(
        { receiptNo: billId },
        { 
          status: status,
          paymentStatus: status === "Paid" ? "paid" : "unpaid",
          paymentDate: paymentDate || new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedReceipt) {
        res.status(404).json({ message: "Receipt not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Receipt payment status updated to ${status}`,
        data: updatedReceipt
      });
    } catch (error: any) {
      console.error("Error updating receipt payment status:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔴 DELETE Receipt
  deleteReceipt: async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedReceipt = await Receipt.findByIdAndDelete(req.params.id);
      if (!deletedReceipt) {
        res.status(404).json({ message: "Receipt not found" });
        return;
      }
      res.status(200).json({ message: "Receipt deleted successfully", deletedReceipt });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Optional: Update by Appointment (kept for backward compatibility)
  updateReceiptByAppointment: async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const updateData = req.body;

      const updatedReceipt = await Receipt.findOneAndUpdate(
        { appointmentId },
        { $set: updateData },
        { new: true }
      );

      if (!updatedReceipt) {
        return res.status(404).json({ message: "Receipt not found for this appointment" });
      }

      res.status(200).json(updatedReceipt);
    } catch (error: any) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
};