import express from "express";
import { paymentController } from "../payment/paymentController.js";

const router = express.Router();

// Debug: Check if controller functions exist
console.log('Payment Controller loaded:', {
  createPaymentIntent: typeof paymentController?.createPaymentIntent,
  confirmPayment: typeof paymentController?.confirmPayment,
  getTransactionByAppointmentId: typeof paymentController?.getTransactionByAppointmentId,
  //getTransactionByBillId: typeof paymentController?.getReceiptByBillId,
  updateTransaction: typeof paymentController?.updateTransaction,
  deleteTransaction: typeof paymentController?.deleteTransaction
});

// Payment Intent
router.post("/create-payment-intent", paymentController.createPaymentIntent);
router.post("/confirm-payment", paymentController.confirmPayment);

//  READ - Payment Transactions
router.get("/transactions/:id", paymentController.getTransactionByAppointmentId);
//router.get("/transaction/:billId", paymentController.getReceiptByBillId);

// UPDATE Payment Transaction
router.put("/transactions/:id", paymentController.updateTransaction);

//  DELETE Payment Transaction
router.delete("/transactions/:id", paymentController.deleteTransaction);

export default router;