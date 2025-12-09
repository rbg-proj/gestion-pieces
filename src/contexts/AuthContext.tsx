import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { loginWithSupabase, getProfile, User } from "@/lib/authService";
import { supabase } from "@/lib/supabase";

// Gestion d'inactivité POS-friendly
const IDLE_TIMEOUT = 3 * 60 * 1000; // 15 min
const WARNING_TIMEOUT = 60 * 1000;   // 60 sec avant déconnexion

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  showWarning: boolean;
  accountDisabled: boolean;
  clearError: () => void;
};

// IMPORTANT : export du contexte pour compatibilité HMR
export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [accountDisabled, setAccountDisabled] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningTimer, setWarningTimer] = useState<NodeJS.Timeout | null>(null);

  // Charger la session si elle existe
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await supabase.auth.getSession();
        const authUser = session.data.session?.user;

        if (authUser) {
          try {
            const profile = await getProfile(authUser.id);

            // Vérifier si le profil est désactivé
            if (profile && profile.status === false) {
              setAccountDisabled(true);
              setError('Votre compte a été désactivé. Contactez votre administrateur pour plus d\'informations.');
              await supabase.auth.signOut();
              localStorage.removeItem("user");
              setUser(null);
              setLoading(false);
              return;
            }

            const refreshedUser: User = {
              id: authUser.id,
              email: authUser.email || "",
              name: profile?.name || "",
              role: profile?.role || "employee",
              phone: profile?.phone || "",
              avatar: profile?.avatar || "",
              status: profile?.status ?? true,
            };
            setUser(refreshedUser);
            setAccountDisabled(false);
          } catch (err) {
            console.error("Erreur chargement du profil:", err);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la restauration de la session:", err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Rafraîchir le profil utilisateur
  const refreshUser = useCallback(async () => {
    const currentSession = await supabase.auth.getSession();
    const authUser = currentSession.data.session?.user;

    if (authUser) {
      const profile = await getProfile(authUser.id);

      // Vérifier si le profil a été désactivé
      if (profile && profile.status === false) {
        setAccountDisabled(true);
        setError('Votre compte a été désactivé. Contactez votre administrateur pour plus d\'informations.');
        await supabase.auth.signOut();
        localStorage.removeItem("user");
        setUser(null);
        return;
      }

      const updatedUser: User = {
        id: authUser.id,
        email: authUser.email || "",
        name: profile?.name || "",
        role: profile?.role || "employee",
        phone: profile?.phone || "",
        avatar: profile?.avatar || "",
        status: profile?.status ?? true,
      };
      setUser(updatedUser);
      setAccountDisabled(false);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  }, []);

  // Login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      setAccountDisabled(false);

      const { user: loggedInUser, error, accountDisabled: isDisabled } = await loginWithSupabase(email, password);

      if (isDisabled) {
        setAccountDisabled(true);
        setError(error);
        return false;
      }

      if (error) {
        setError(error);
        return false;
      }

      if (loggedInUser) {
        setUser(loggedInUser);
        setAccountDisabled(false);
        localStorage.setItem("user", JSON.stringify(loggedInUser));
        return true;
      }

      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    setUser(null);
    setAccountDisabled(false);
    setError(null);
  }, []);

  // Effacer les erreurs
  const clearError = useCallback(() => {
    setError(null);
    setAccountDisabled(false);
  }, []);

  // Gestion de l'inactivité (POS friendly)
  useEffect(() => {
    const resetTimer = () => {
      setLastActivity(Date.now());
      setShowWarning(false);
      if (warningTimer) clearTimeout(warningTimer);
    };

    const events = [
      "mousemove", "mousedown", "keydown",
      "scroll", "touchstart", "pointerdown",
      "focus",
    ];

    events.forEach((event) => window.addEventListener(event, resetTimer));

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;

      if (idleTime > IDLE_TIMEOUT - WARNING_TIMEOUT &&
          idleTime <= IDLE_TIMEOUT &&
          !showWarning) {

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
        accountDisabled,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
