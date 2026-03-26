import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { Bars3Icon, BellIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

interface AdminHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
}) => {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return "Never";
    const date = new Date(lastLogin);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  };

  return (
    <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-700"
              aria-label="Toggle sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex flex-col items-start">
              <h1 className="text-2xl font-semibold text-gray-800">
                Welcome back, {admin?.fullName || admin?.username || "Admin"}
              </h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="hidden sm:inline-flex p-2 rounded-xl hover:bg-gray-100 text-gray-700" aria-label="Notifications">
              <BellIcon className="h-6 w-6" />
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm shadow-sm">
                  {(admin?.fullName || admin?.username || "A").charAt(0)}
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {admin?.fullName || admin?.username}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl z-50 border border-gray-100 overflow-hidden">
                  {/* Admin info */}
                  <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">
                        {(admin?.fullName || admin?.username || "A").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {admin?.fullName || admin?.username}
                        </p>
                        <p className="text-xs text-blue-100">{admin?.email}</p>
                        <p className="text-[11px] text-blue-100 mt-1">
                          Last login: {formatLastLogin(admin?.lastLogin)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-5 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Cog6ToothIcon className="mr-3 h-5 w-5" />
                      Settings
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-5 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
