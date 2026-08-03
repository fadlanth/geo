import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type UserRole = 'admin' | 'operator' | 'dosen' | 'guest';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  nama?: string | null;
  nip?: string | null;
}

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  username: string;
  userId: string | null;
  email: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (uid: string, email?: string | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile(data as Profile);
      } else {
        setProfile({ id: uid, email: email ?? '', role: 'guest', nama: email?.split('@')[0] ?? 'Pengguna' });
      }
    } catch (err) {
      // Profil belum ada (mis. migrasi 0001 belum dijalankan) → fallback aman.
      setProfile({ id: uid, email: email ?? '', role: 'guest', nama: email?.split('@')[0] ?? 'Pengguna' });
    }
  };

  const handleAuth = async (current: User | null) => {
    setUser(current);
    if (current) {
      await loadProfile(current.id, current.email);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      sessionRef(data.session);
      handleAuth(data.session?.user ?? null).finally(() => setIsLoading(false));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      sessionRef(currentSession);
      handleAuth(currentSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper setter session agar tidak duplikat di dalam closure
  const sessionRef = (s: Session | null) => setSession(s);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id, user.email);
  };

  const role: UserRole = profile?.role ?? 'guest';
  const username = profile?.nama?.trim() || user?.email?.split('@')[0] || 'Pengguna';
  const userId = user?.id ?? null;
  const email = user?.email ?? '';

  const value: AuthContextType = {
    isLoading,
    isAuthenticated: !!user,
    session,
    user,
    profile,
    role,
    username,
    userId,
    email,
    login,
    logout,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}