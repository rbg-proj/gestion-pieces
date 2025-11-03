import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { loginWithSupabase, getProfile, User } from '@/lib/authService';
import { supabase } from '@/lib/supabase';

// Gestion d'inactivité POS-friendly
const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 min
const WARNING_TIMEOUT = 60 * 1000;   // 60 sec de préavis avant déconnexion

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  showWarning: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  refreshUser: async () => {},
  showWarning: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningTimer, setWarningTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      const session = await supabase.auth.getSession();
      const authUser = session.data.session?.user;

      if (authUser) {
        try {
          const profile = await getProfile(authUser.id);
          const refreshedUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: profile?.name || '',
            role: profile?.role || 'employee',
            phone: profile?.phone || '',
            avatar: profile?.avatar || ''
          };
          setUser(refreshedUser);
        } catch (err) {
          console.error('Erreur de chargement du profil:', err);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const refreshUser = async () => {
    const currentSession = await supabase.auth.getSession();
    const authUser = currentSession.data.session?.user;

    if (authUser) {
      const profile = await getProfile(authUser.id);
      const updatedUser: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: profile?.name || '',
        role: profile?.role || 'employee',
        phone: profile?.phone || '',
        avatar: profile?.avatar || ''
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const { user: loggedInUser, error } = await loginWithSupabase(email, password);
      if (error) {
        setError(error);
        return false;
      }
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Gestion d'inactivité
  useEffect(() => {
    const resetTimer = () => {
      setLastActivity(Date.now());
      setShowWarning(false);
      if (warningTimer) clearTimeout(warningTimer);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown', 'focus'];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;

      if (idleTime > IDLE_TIMEOUT - WARNING_TIMEOUT && idleTime <= IDLE_TIMEOUT && !showWarning) {
        setShowWarning(true);
        const timer = setTimeout(() => {
          logout();
        }, WARNING_TIMEOUT);
        setWarningTimer(timer);
      }

      if (idleTime > IDLE_TIMEOUT && !showWarning) {
        logout();
      }
    }, 1000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearInterval(interval);
    };
  }, [lastActivity, logout, showWarning, warningTimer]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
        refreshUser,
        showWarning,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
