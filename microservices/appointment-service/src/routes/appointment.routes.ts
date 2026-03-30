import express from "express";
import {
    createAppointment, getAppointments, getAppointmentById, updateAppointment,
    deleteAppointment, cancelAppointment, rescheduleAppointment,
    getAppointmentsByPatient, getDoctorAppointmentsByDate, getDoctorAppointments,
} from "../controllers/appointment.controller.js";

const router = express.Router();

router.get("/doctor/:doctorId/date/:date", getDoctorAppointmentsByDate);
router.get("/doctor/:doctorId", getDoctorAppointments);
router.post("/", createAppointment);
router.get("/", getAppointments);
router.get("/:id", getAppointmentById);
router.put("/:id", updateAppointment);
router.delete("/:id", deleteAppointment);
router.post("/:id/cancel", cancelAppointment);
router.post("/:id/reschedule", rescheduleAppointment);
router.get("/patient/:patientId", getAppointmentsByPatient);

export default router;
