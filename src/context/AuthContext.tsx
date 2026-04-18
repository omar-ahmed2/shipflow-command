import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/supabase';

type UserProfile = Tables<'users'>;
type CourierProfile = Tables<'couriers'>;
type SellerProfile = Tables<'sellers'>;

interface AuthContextType {
  user: UserProfile | null;
  courierProfile: CourierProfile | null;
  sellerProfile: SellerProfile | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [courierProfile, setCourierProfile] = useState<CourierProfile | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(profile);

      if (profile.role === 'courier') {
        const { data: courier, error: cError } = await supabase
          .from('couriers')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (!cError) setCourierProfile(courier);
      } else if (profile.role === 'seller') {
        const { data: seller, error: sError } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (!sError) setSellerProfile(seller);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setUser(null);
      setCourierProfile(null);
      setSellerProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setCourierProfile(null);
        setSellerProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      courierProfile, 
      sellerProfile, 
      login, 
      logout, 
      isAuthenticated: !!user, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
