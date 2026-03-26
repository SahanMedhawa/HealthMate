import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { HomeIcon, UsersIcon, CalendarDaysIcon, ChartBarIcon, ChevronDoubleLeftIcon, XMarkIcon, QueueListIcon } from "@heroicons/react/24/outline";

interface AdminSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const navigationItems = [
    {
      name: "Overview",
      href: "/admin/dashboard/overview",
      icon: <HomeIcon className="w-5 h-5" />,
    },
    {
      name: "Users",
      href: "/admin/dashboard/users",
      icon: <UsersIcon className="w-5 h-5" />,
    },
    {
      name: "Appointments",
      href: "/admin/dashboard/appointments",
      icon: <CalendarDaysIcon className="w-5 h-5" />,
    },
    {
      name: "Queue Monitor",
      href: "/admin/dashboard/queues",
      icon: <QueueListIcon className="w-5 h-5" />,
    },
    {
      name: "Reports",
      href: "/admin/dashboard/reports",
      icon: <ChartBarIcon className="w-5 h-5" />,
    },
  ];

  const sidebarClasses = `
    ${isMobile ? "fixed inset-y-0 left-0 z-40" : "relative"}
    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    ${isMobile ? "w-64" : isOpen ? "w-64" : "w-20"}
    bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 ease-in-out flex flex-col
  `;

  return (
    <div className={sidebarClasses}>
      {/* Sidebar header */}
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">A</div>
          <span className={`ml-2 font-semibold text-gray-800 ${!isOpen && !isMobile ? "hidden" : "block"}`}>
            Admin Panel
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {!isMobile && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Collapse sidebar"
            >
              <ChevronDoubleLeftIcon className={`w-5 h-5 transition-transform ${isOpen ? "rotate-0" : "rotate-180"}`} />
            </button>
          )}
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Close sidebar">
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => isMobile && setSidebarOpen(false)}
              className={`group flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 ${isActive
                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-200"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mr-3 ${isActive ? "bg-white text-blue-600 shadow-sm" : "bg-gray-100 text-gray-600 group-hover:bg-white group-hover:shadow-sm"}`}>
                {item.icon}
              </span>
              <span className={` ${!isOpen && !isMobile ? "hidden" : "block"}`}>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-200">
        <div className={`flex items-center ${!isOpen && !isMobile ? "justify-center" : "justify-between"}`}>
          <span className={`text-xs text-gray-500 ${!isOpen && !isMobile ? "hidden" : "block"}`}>HealthMate Admin v1.0</span>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className={`ml-1 text-xs text-gray-500 ${!isOpen && !isMobile ? "hidden" : "block"}`}>Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
