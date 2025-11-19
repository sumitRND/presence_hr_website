"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api";

interface LoginResponse {
  token: string;
  message?: string;
}

interface AuthContextType {
  user: string | null;
  isLoading: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("hr_token");
    if (token) {
      setUser("HRUser");
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, pass: string) => {
    try {
      const response = await api.post<LoginResponse>("/hr/login", {
        username,
        password: pass,
      });
      if (response.success && response.token) {
        localStorage.setItem("hr_token", response.token);
        setUser(username);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("hr_token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
