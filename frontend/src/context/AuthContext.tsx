import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// Define User interface locally to avoid import issues
interface User {
  id: string;
  name: string;
  email: string;
  userType?: string;
  photoURL?: string;
  specialization?: string;
}

interface AuthContextType {
  user: User | null;
  token?: string | null;
  setUser: (user: User | null, token?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored user data on app load
    const storedUser = localStorage.getItem("healthmate_user");
    const storedToken = localStorage.getItem("healthmate_token");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem("healthmate_user");
      }
    }
    if (storedToken) {
      setTokenState(storedToken);
    }
  }, []);

  const handleSetUser = (userData: User | null, authToken?: string) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem("healthmate_user", JSON.stringify(userData));
    } else {
      localStorage.removeItem("healthmate_user");
    }

    if (authToken !== undefined) {
      setTokenState(authToken);
      if (authToken) {
        localStorage.setItem("healthmate_token", authToken);
      } else {
        localStorage.removeItem("healthmate_token");
      }
    }
  };

  const logout = () => {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("healthmate_user");
    localStorage.removeItem("healthmate_token");
    localStorage.removeItem("healthmate_doctor_token"); // clear legacy tokens
    localStorage.removeItem("token");
  };

  const value: AuthContextType = {
    user,
    token,
    setUser: handleSetUser,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
