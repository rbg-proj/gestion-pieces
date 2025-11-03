import { supabase } from './supabase';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  phone?: string;
  avatar?: string;
};

// Connexion et récupération du profil depuis la table "profiles"
export async function loginWithSupabase(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'No user data returned' };
    }

    const authUser = data.user;

    // 🔁 Récupération des infos depuis la table "profiles"
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role, phone, avatar')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      return {
        user: null,
        error: 'Erreur lors de la récupération du profil: ' + profileError.message
      };
    }

    const user: User = {
      id: authUser.id,
      name: profile?.name || authUser.user_metadata?.name || email.split('@')[0],
      email: authUser.email || '',
      role: profile?.role || authUser.user_metadata?.role || 'employee',
      phone: profile?.phone || '',
      avatar: profile?.avatar || ''
    };

    return { user, error: null };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : 'An unexpected error occurred'
    };
  }
}

// 🔎 Récupérer le profil d'un utilisateur depuis "profiles"
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, role, phone, avatar')
    .eq('id', userId)
    .single();

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
