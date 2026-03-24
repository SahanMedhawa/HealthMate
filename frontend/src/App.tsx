import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import HomePage from "./components/Home";
import Register from "./pages/user/Register";
import Login from "./pages/user/Login";
import Verify from "./pages/user/Verify";
import AppointmentConfirmation from "./components/user/AppointmentConfirmation";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import "./App.css";
import DoctorManagement from "./pages/admin/DoctorManagement";
import DoctorsDirectory from "./pages/user/DoctorsDirectory";
import DoctorLayout from "./components/doctor/DoctorLayout";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientManagement from "./pages/doctor/PatientManagement";
import DoctorAvailability from "./pages/doctor/DoctorAvailability";
import DoctorProfile from "./pages/doctor/DoctorProfile";
import DoctorReports from "./pages/doctor/DoctorReports";
import AvailableSlots from "./pages/user/AvailableSlots";
import MyAppointments from "./pages/user/MyAppointments";
import Pricing from "./pages/user/Pricing";
import QueueStatusPage from "./pages/user/QueueStatusPage";
import DoctorQueue from "./pages/doctor/DoctorQueue";
import AdminQueueDashboard from "./pages/admin/AdminQueueDashboard";

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify/:token" element={<Verify />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard/*" element={<AdminDashboard />} />

            {/* User Routes */}
            <Route path="/user/home" element={<HomePage />} />
            <Route path="/queue-status" element={<QueueStatusPage />} />
            <Route path="/my-appointments" element={<MyAppointments />} />
            <Route path="/appointment/confirmation" element={<AppointmentConfirmation />}/>
            <Route path="/doctorsdir" element={<DoctorsDirectory />} />
            <Route path="/doctors/:id/slots" element={<AvailableSlots />} />
            <Route path="/pricing" element={<Pricing />} />
            
            {/* Doctor Routes */}
            <Route path="/doctor/*" element={<DoctorLayout />}>
              <Route path="dashboard" element={<DoctorDashboard />} />
              <Route path="patients" element={<PatientManagement />} />
              <Route path="queue" element={<DoctorQueue />} />
              <Route path="availability" element={<DoctorAvailability />} />
              <Route path="profile" element={<DoctorProfile />} />
              <Route path="reports" element={<DoctorReports />} />
            </Route>

            {/* Legacy admin route - keep for backwards compatibility */}
            <Route path="/doctors" element={<DoctorManagement />} />
          </Routes>
        </Router>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
