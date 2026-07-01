'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { setAccessToken } from '@/lib/api';
import {
  loginUser,
  registerUser,
  refreshToken as refreshTokenApi,
  logoutUser,
  type UserData,
  type RegisterRequest,
} from '@/lib/auth-api';

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthResponse = useCallback((data: { accessToken: string; refreshToken: string; user: UserData }) => {
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  // On mount: try to restore session from refresh token
  useEffect(() => {
    const init = async () => {
      const storedRefresh = localStorage.getItem('refreshToken');
      if (!storedRefresh) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await refreshTokenApi(storedRefresh);
        if (res.data) {
          handleAuthResponse(res.data);
        }
      } catch {
        localStorage.removeItem('refreshToken');
      }
      setIsLoading(false);
    };
    init();
  }, [handleAuthResponse]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    if (res.data) {
      handleAuthResponse(res.data);
    }
  }, [handleAuthResponse]);

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await registerUser(data);
    if (res.data) {
      handleAuthResponse(res.data);
    }
  }, [handleAuthResponse]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
