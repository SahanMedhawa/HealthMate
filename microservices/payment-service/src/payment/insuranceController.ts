import { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import InsuranceClaim from "../models/Insurance.js";
import Receipt from "../models/Receipt.js";

const APPOINTMENT_SERVICE_URL =
  process.env.APPOINTMENT_SERVICE_URL || "http://appointment-service:5003";
const SERVICE_SECRET = process.env.SERVICE_SECRET || "your-secret-key";

export const insuranceController = {
  // 🏥 Create Insurance Claim
  createClaim: async (req: Request, res: Response): Promise<void> => {
    try {
      const { billId, appointmentId, ...claimData } = req.body;

      const claim = new InsuranceClaim({
        ...claimData,
        billId,
        status: "submitted",
      });

      await claim.save();

      // Link paymentTransactionId to receipt
      await Receipt.findByIdAndUpdate(billId, {
        status: "Claim Pending",
        paymentTransactionId: claim._id,
      });

      // Link insurance claim to appointment
      if (appointmentId) {
        try {
          const token = jwt.sign({ service: "payment-service" }, SERVICE_SECRET);

          await axios.patch(
            `${APPOINTMENT_SERVICE_URL}/api/appointment/${appointmentId}/payment-status`,
            {
              paymentTransactionId: claim._id,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (appointmentError: any) {
          console.warn(
            "Warning: Could not link insurance claim to appointment:",
            appointmentError.message
          );
          // Don't fail the claim creation if appointment linking fails
        }
      }

      res.json({
        success: true,
        message: "Insurance claim submitted",
        claimId: claim._id,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        message: "Insurance claim failed",
        error: error.message,
      });
    }
  },

  // 🔵 READ - Insurance Claim by ID
  getClaimById: async (req: Request, res: Response): Promise<void> => {
    try {
      const claim = await InsuranceClaim.findById(req.params.id);
      if (!claim) {
        res.status(404).json({ message: "Insurance claim not found" });
        return;
      }
      res.status(200).json(claim);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🟡 UPDATE Insurance Claim Status
  updateClaim: async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, notes } = req.body;

      const updatedClaim = await InsuranceClaim.findByIdAndUpdate(
        req.params.id,
        { status, notes, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!updatedClaim) {
        res.status(404).json({ message: "Insurance claim not found" });
        return;
      }

      // Update receipt status based on claim status
      if (status === "approved") {
        await Receipt.findByIdAndUpdate(updatedClaim.billId, {
          status: "Paid",
        });
      } else if (status === "rejected") {
        await Receipt.findByIdAndUpdate(updatedClaim.billId, {
          status: "Pending",
        });
      }

      res.status(200).json(updatedClaim);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔴 DELETE Insurance Claim
  deleteClaim: async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedClaim = await InsuranceClaim.findByIdAndDelete(
        req.params.id
      );

      if (!deletedClaim) {
        res.status(404).json({ message: "Insurance claim not found" });
        return;
      }

      // Reset receipt status
      await Receipt.findByIdAndUpdate(deletedClaim.billId, {
        status: "Pending",
      });

      res.status(200).json({
        message: "Insurance claim deleted successfully",
        deletedClaim,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};