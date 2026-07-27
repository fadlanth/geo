import React, { createContext, useContext, useState, useEffect } from 'react';

type UserRole = 'admin' | 'guest';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  username: string | null;
}

interface AuthContextType extends AuthState {
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('geo_info_auth');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { isAuthenticated: false, role: 'guest', username: null };
      }
    }
    return { isAuthenticated: false, role: 'guest', username: null };
  });

  useEffect(() => {
    localStorage.setItem('geo_info_auth', JSON.stringify(auth));
  }, [auth]);

  const login = (password: string) => {
    // Sederhana untuk demo: password admin adalah 'admin123'
    if (password === 'admin123') {
      setAuth({
        isAuthenticated: true,
        role: 'admin',
        username: 'Administrator'
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setAuth({
      isAuthenticated: false,
      role: 'guest',
      username: null
    });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
