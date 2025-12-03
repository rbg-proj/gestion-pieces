import { supabase } from './supabase';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  phone?: string;
  avatar?: string;
  status?: boolean;
};

// Connexion et récupération du profil depuis la table "profiles"
export async function loginWithSupabase(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null; accountDisabled?: boolean }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Aucune donnée utilisateur retournée' };
    }

    const authUser = data.user;

    // 🔁 Récupération des infos depuis la table "profiles"
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role, phone, avatar, status')
      .eq('id', authUser.id)
      .maybeSingle();

    // Vérifier si le profil est désactivé
    if (profile && profile.status === false) {
      // Déconnecter immédiatement l'utilisateur
      await supabase.auth.signOut();
      return {
        user: null,
        error: 'Votre compte a été désactivé. Contactez l\'administrateur pour plus d\'informations.',
        accountDisabled: true
      };
    }

    // If profile doesn't exist, create one with default values
    if (!profile && !profileError) {
      const defaultName = authUser.user_metadata?.name || email.split('@')[0];
      const defaultRole = authUser.user_metadata?.role || 'employee';

      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          name: defaultName,
          role: defaultRole,
          status: true
        });

      if (createError) {
        console.error('Erreur lors de la création du profil:', createError);
      }
    }

    const user: User = {
      id: authUser.id,
      name: profile?.name || authUser.user_metadata?.name || email.split('@')[0],
      email: authUser.email || '',
      role: profile?.role || authUser.user_metadata?.role || 'employee',
      phone: profile?.phone || '',
      avatar: profile?.avatar || '',
      status: profile?.status ?? true
    };

    return { user, error: null };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite'
    };
  }
}

// 🔎 Récupérer le profil d'un utilisateur depuis "profiles"
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, role, phone, avatar, status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ✏️ Mettre à jour le profil utilisateur dans "profiles"
export async function updateProfile(userId: string, updates: {
  name?: string;
  phone?: string;
  avatar?: string;
}) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

// 🖼️ Upload d'un avatar dans Supabase Storage (bucket "avatars")
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}.${fileExt}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase
    .storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
