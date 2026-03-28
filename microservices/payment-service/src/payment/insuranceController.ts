import { Request, Response } from "express";
import InsuranceClaim from "../models/Insurance.js";
import Receipt from "../models/Receipt.js";

export const insuranceController = {
  // 🏥 Create Insurance Claim
  createClaim: async (req: Request, res: Response): Promise<void> => {
    try {
      const claim = new InsuranceClaim({
        ...req.body,
        status: "submitted",
      });

      await claim.save();

      await Receipt.findByIdAndUpdate(req.body.billId, {
        status: "Claim Pending",
      });

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