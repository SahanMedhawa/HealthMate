import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "../api/client";

interface Admin {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: "admin";
  lastLogin?: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored admin data and token on app load
  useEffect(() => {
    const token = localStorage.getItem("healthmate_admin_token");
    const storedAdmin = localStorage.getItem("healthmate_admin_user");

    if (token && storedAdmin) {
      try {
        const adminData = JSON.parse(storedAdmin);
        setAdmin(adminData);
      } catch (error) {
        // If there's an error parsing, clear the invalid data
        localStorage.removeItem("healthmate_admin_token");
        localStorage.removeItem("healthmate_admin_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await api.post("/admin/login", { username, password });
      const data = response.data;

      if (data.success && data.data) {
        const { token, admin: adminData } = data.data;

        // Store token and admin data
        localStorage.setItem("healthmate_admin_token", token);
        localStorage.setItem("healthmate_admin_user", JSON.stringify(adminData));

        setAdmin(adminData);
      } else {
        throw new Error(data.message || "Invalid response from server");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Login failed";
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem("healthmate_admin_token");
    localStorage.removeItem("healthmate_admin_user");
    setAdmin(null);
  };

  const getToken = (): string | null => {
    return localStorage.getItem("healthmate_admin_token");
  };

  const value: AdminAuthContextType = {
    admin,
    isAuthenticated: !!admin,
    isLoading,
    login,
    logout,
    getToken,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
