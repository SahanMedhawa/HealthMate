import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminOverview from "../../components/admin/AdminOverview";
import AdminUsers from "../../components/admin/AdminUsers";
import AdminAppointments from "../../components/admin/AdminAppointments";
import AdminRoute from "../../components/admin/AdminRoute";
import AdminQueueDashboard from "./AdminQueueDashboard";
import AdminReports from "./AdminReports";

const AdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-100">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <AdminSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isMobile={isMobile}
          />

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <AdminHeader
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />

            {/* Page content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
              <div className="container mx-auto px-6 py-8">
                <Routes>
                  <Route path="/" element={<Navigate to="/admin/dashboard/overview" replace />} />
                  <Route path="/overview" element={<AdminOverview />} />
                  <Route path="/users" element={<AdminUsers />} />
                  <Route path="/appointments" element={<AdminAppointments />} />
                  <Route path="/queues" element={<AdminQueueDashboard />} />
                  <Route path="/reports" element={<AdminReports />} />
                  {/* Add more routes as needed */}
                </Routes>
              </div>
            </main>
          </div>

          {/* Mobile sidebar overlay */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>
    </AdminRoute>
  );
};

export default AdminDashboard;
