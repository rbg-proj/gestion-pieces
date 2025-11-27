import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  name: string | null;
  role: string | null;
  phone: string | null;
  avatar: string | null;
};

type AuthContextType = {
  user: any | null;
  profile: Profile | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<{ error: any | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /** --------------------------------------------
   * 🔹 Récupère le profil depuis la table Profiles
   * --------------------------------------------- */
  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("Profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Erreur récupération profil:", error.message);
      return;
    }

    setProfile(data as Profile);
  };

  /** --------------------------------------------
   * 🔹 Login utilisateur
   * --------------------------------------------- */
  const login = async (email: string, password: string) => {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      return { error };
    }

    setUser(data.user);
    await refreshProfile();
    setLoading(false);

    return { error: null };
  };

  /** --------------------------------------------
   * 🔹 Logout
   * --------------------------------------------- */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  /** --------------------------------------------
   * 🔹 Au démarrage, vérifie session existante
   * --------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        await refreshProfile();
      }

      setLoading(false);
    };

    init();

    /** --------------------------------------------
     * 🔹 Écoute les changements d'état auth
     * --------------------------------------------- */
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await refreshProfile();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** --------------------------------------------
 * 🔹 Hook pour accéder au contexte Auth
 * --------------------------------------------- */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
