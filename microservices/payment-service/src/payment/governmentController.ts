import { Request, Response } from "express";
import GovernmentFunding from "../models/GovermentFunding.js";
import Receipt from "../models/Receipt.js";

export const governmentController = {
  // 🏛️ Create Government Funding Request
  createFunding: async (req: Request, res: Response): Promise<void> => {
    try {
      const funding = new GovernmentFunding({
        ...req.body,
        status: "submitted",
      });

      await funding.save();

      await Receipt.findByIdAndUpdate(req.body.billId, {
        status: "Funding Pending",
      });

      res.json({
        success: true,
        message: "Government funding request submitted",
        fundingId: funding._id,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        message: "Government funding failed",
        error: error.message,
      });
    }
  },

  // 🔵 READ - Government Funding by ID
  getFundingById: async (req: Request, res: Response): Promise<void> => {
    try {
      const funding = await GovernmentFunding.findById(req.params.id);

      if (!funding) {
        res
          .status(404)
          .json({ message: "Government funding request not found" });
        return;
      }

      res.status(200).json(funding);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🟡 UPDATE Government Funding Status
  updateFunding: async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, notes } = req.body;

      const updatedFunding = await GovernmentFunding.findByIdAndUpdate(
        req.params.id,
        { status, notes, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!updatedFunding) {
        res
          .status(404)
          .json({ message: "Government funding request not found" });
        return;
      }

      // Update receipt status based on funding status
      if (status === "approved") {
        await Receipt.findByIdAndUpdate(updatedFunding.billId, {
          status: "Paid",
        });
      } else if (status === "rejected") {
        await Receipt.findByIdAndUpdate(updatedFunding.billId, {
          status: "Pending",
        });
      }

      res.status(200).json(updatedFunding);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔴 DELETE Government Funding
  deleteFunding: async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedFunding = await GovernmentFunding.findByIdAndDelete(
        req.params.id
      );

      if (!deletedFunding) {
        res
          .status(404)
          .json({ message: "Government funding request not found" });
        return;
      }

      // Reset receipt status
      await Receipt.findByIdAndUpdate(deletedFunding.billId, {
        status: "Pending",
      });

      res.status(200).json({
        message: "Government funding request deleted successfully",
        deletedFunding,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};