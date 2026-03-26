import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import DoctorHeader from "./DoctorHeader";
import DoctorSidebar from "./DoctorSidebar";

const DoctorLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex">
      {/* Sidebar */}
      {!isMobile && (
        <DoctorSidebar 
          sidebarOpen={true} 
          setSidebarOpen={setSidebarOpen} 
          isMobile={isMobile} 
        />
      )}
      
      {/* Mobile Sidebar */}
      {isMobile && (
        <DoctorSidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          isMobile={isMobile} 
        />
      )}
      
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <DoctorHeader 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />

        {/* Page Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;
