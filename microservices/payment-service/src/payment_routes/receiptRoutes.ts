import express from "express";
import { receiptController } from "../payment/receiptController.js";

const router = express.Router();

// CREATE Receipt
router.post("/", receiptController.createReceipt);

// READ - All receipts
router.get("/", receiptController.getAllReceipts);

// READ - Receipt by ID
router.get("/:id", receiptController.getReceiptById);

//  READ - Receipts by patient ID
router.get("/patient/:patientId", receiptController.getReceiptsByPatientId);

//  UPDATE Receipt
router.put("/:id", receiptController.updateReceipt);

//  DELETE Receipt
router.delete("/:id", receiptController.deleteReceipt);

export default router;