import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: number;
  full_name: string;
  email: string;
  household_size?: number;
  is_2fa_enabled: boolean;
  food_visibility: 'public' | 'private';
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

import { api } from '@/lib/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem('sp_user');
    return u ? JSON.parse(u) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sp_token'));

  useEffect(() => {
    if (token) {
      api('/auth/me')
        .then(data => setUser(data))
        .catch((err: Error & { status?: number }) => {
          // Only logout on 401 (truly unauthorized / expired token).
          // For rate-limit (429) or network errors, keep the cached session.
          if (err.status === 401) logout();
        });
    }
  }, []);

  const login = (user: User, token: string) => {
    setUser(user); setToken(token);
    localStorage.setItem('sp_user', JSON.stringify(user));
    localStorage.setItem('sp_token', token);
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('sp_user');
    localStorage.removeItem('sp_token');
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('sp_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!user && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
