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

const seedDemoData = () => {
  if (!localStorage.getItem('sp_users')) {
    localStorage.setItem('sp_users', JSON.stringify([{
      id: 1, full_name: 'Demo User', email: 'demo@saveplate.my',
      password: 'Demo1234!', household_size: 4,
      is_2fa_enabled: false, food_visibility: 'public', is_verified: true,
    }]));
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    seedDemoData();
    const u = localStorage.getItem('sp_user');
    const t = localStorage.getItem('sp_token');
    if (u && t) { setUser(JSON.parse(u)); setToken(t); }
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
    const users = JSON.parse(localStorage.getItem('sp_users') || '[]');
    const idx = users.findIndex((u: User & { password: string }) => u.id === user.id);
    if (idx !== -1) { users[idx] = { ...users[idx], ...updates }; localStorage.setItem('sp_users', JSON.stringify(users)); }
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
