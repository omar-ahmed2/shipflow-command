import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '@/db';
import { seedDatabase } from '@/db/seed';
import { verifyPassword } from '@/db/helpers';
import type { User, Courier } from '@/db/schema';

interface AuthContextType {
  user: User | null;
  courierProfile: Courier | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [courierProfile, setCourierProfile] = useState<Courier | null>(null);

  useEffect(() => {
    seedDatabase();
    const savedUserId = localStorage.getItem('shipflow_currentUser');
    if (savedUserId) {
      const u = db.getById<User>('users', savedUserId);
      if (u && u.status === 'active') {
        setUser(u);
        if (u.role === 'courier') {
          const c = db.query<Courier>('couriers', c => c.userId === u.id);
          if (c.length > 0) setCourierProfile(c[0]);
        }
      }
    }
  }, []);

  const login = useCallback((email: string, password: string): boolean => {
    const users = db.getAll<User>('users');
    const found = users.find(u => u.email === email && u.status === 'active');
    if (!found || !verifyPassword(password, found.passwordHash)) return false;
    setUser(found);
    localStorage.setItem('shipflow_currentUser', found.id);
    if (found.role === 'courier') {
      const c = db.query<Courier>('couriers', c => c.userId === found.id);
      if (c.length > 0) setCourierProfile(c[0]);
    }
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCourierProfile(null);
    localStorage.removeItem('shipflow_currentUser');
  }, []);

  return (
    <AuthContext.Provider value={{ user, courierProfile, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
