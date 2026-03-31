import express from "express";
import {
    createAppointment, getAppointmentById, updateAppointment,
    deleteAppointment, cancelAppointment, rescheduleAppointment,
    getAppointmentsByPatient, getDoctorAppointmentsByDate, getDoctorAppointments,
    updatePaymentStatus, getPaymentStatus
} from "../controllers/appointment.controller.js";

const router = express.Router();

//  Specific static-segment routes FIRST
router.get("/doctor/:doctorId/date/:date", getDoctorAppointmentsByDate);
router.get("/doctor/:doctorId", getDoctorAppointments);
router.get("/patient/:patientId", getAppointmentsByPatient);

//  Payment-status routes BEFORE generic /:id routes
router.patch("/:appointmentId/payment-status", updatePaymentStatus);
router.get("/:appointmentId/payment-status", getPaymentStatus);  // ← moved up

//  Generic /:id routes LAST (these are catch-alls)
router.post("/", createAppointment);
router.get("/:id", getAppointmentById);          // ← moved down
router.put("/:id", updateAppointment);
router.delete("/:id", deleteAppointment);
router.post("/:id/cancel", cancelAppointment);
router.post("/:id/reschedule", rescheduleAppointment);

export default router;
