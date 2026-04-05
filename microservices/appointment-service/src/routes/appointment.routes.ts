import express from "express";
import {
    createAppointment, getAppointmentById, updateAppointment,
    deleteAppointment, cancelAppointment, rescheduleAppointment,
    getAppointmentsByPatient, getDoctorAppointmentsByDate, getDoctorAppointments,
    updatePaymentStatus, getPaymentStatus, getAllAppointments
} from "../controllers/appointment.controller.js";

const router = express.Router();

//  POST routes FIRST
router.post("/", createAppointment);

//  Get all appointments (must be before /:id routes)
router.get("/", getAllAppointments);

//  Specific static-segment routes (before generic /:id routes)
router.get("/doctor/:doctorId/date/:date", getDoctorAppointmentsByDate);
router.get("/doctor/:doctorId", getDoctorAppointments);
router.get("/patient/:patientId", getAppointmentsByPatient);

//  Payment-status routes BEFORE generic /:id routes
router.patch("/:appointmentId/payment-status", updatePaymentStatus);
router.get("/:appointmentId/payment-status", getPaymentStatus);

//  Generic /:id routes LAST (these are catch-alls)
router.get("/:id", getAppointmentById);
router.put("/:id", updateAppointment);
router.delete("/:id", deleteAppointment);
router.post("/:id/cancel", cancelAppointment);
router.post("/:id/reschedule", rescheduleAppointment);

export default router;
