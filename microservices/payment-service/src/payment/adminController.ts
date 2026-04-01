import { Request, Response } from "express";
import InsuranceClaim from "../models/Insurance.js";
import GovernmentFunding from "../models/GovermentFunding.js";
import PaymentTransaction from "../models/paymentTransaction.js";
import Receipt from "../models/Receipt.js";

export const adminController = {
  // 📊 Dashboard Statistics
  getDashboardStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const [
        totalReceipts,
        paidReceipts,
        pendingReceipts,
        claimPendingReceipts,
        fundingPendingReceipts,
        totalTransactions,
        totalClaims,
        totalFunding
      ] = await Promise.all([
        Receipt.countDocuments(),
        Receipt.countDocuments({ status: "Paid" }),
        Receipt.countDocuments({ status: "Pending" }),
        Receipt.countDocuments({ status: "Claim Pending" }), // ✅ Fixed case
        Receipt.countDocuments({ status: "Funding Pending" }), // ✅ Fixed case
        PaymentTransaction.countDocuments(),
        InsuranceClaim.countDocuments(),
        GovernmentFunding.countDocuments()
      ]);

      const revenueStats = await Receipt.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            paidRevenue: { 
              $sum: { 
                $cond: [{ $eq: ["$status", "Paid"] }, "$total", 0] 
              } 
            },
            pendingRevenue: { 
              $sum: { 
                $cond: [{ $eq: ["$status", "Pending"] }, "$total", 0] 
              } 
            },
            // Optional: Add revenue for claim and funding pending receipts
            claimPendingRevenue: {
              $sum: {
                $cond: [{ $eq: ["$status", "Claim Pending"] }, "$total", 0]
              }
            },
            fundingPendingRevenue: {
              $sum: {
                $cond: [{ $eq: ["$status", "Funding Pending"] }, "$total", 0]
              }
            }
          }
        }
      ]);

      const stats = {
        receipts: {
          total: totalReceipts,
          paid: paidReceipts,
          pending: pendingReceipts,
          claimPending: claimPendingReceipts,
          fundingPending: fundingPendingReceipts
        },
        transactions: totalTransactions,
        claims: totalClaims,
        funding: totalFunding,
        revenue: revenueStats[0] || { 
          totalRevenue: 0, 
          paidRevenue: 0, 
          pendingRevenue: 0,
          claimPendingRevenue: 0,
          fundingPendingRevenue: 0
        }
      };

      res.status(200).json(stats);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔵 READ - All Insurance Claims
  getAllInsuranceClaims: async (req: Request, res: Response): Promise<void> => {
    try {
      const claims = await InsuranceClaim.find().sort({ createdAt: -1 });
      res.status(200).json(claims);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔵 READ - All Government Funding
  getAllGovernmentFunding: async (req: Request, res: Response): Promise<void> => {
    try {
      const funding = await GovernmentFunding.find().sort({ createdAt: -1 });
      res.status(200).json(funding);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 🔵 READ - All Payment Transactions
  getAllTransactions: async (req: Request, res: Response): Promise<void> => {
    try {
      const transactions = await PaymentTransaction.find().sort({ createdAt: -1 });
      res.status(200).json(transactions);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
};