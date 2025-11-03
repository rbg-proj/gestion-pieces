import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, avatar')
        .eq('id', user.id)
        .single();

      if (data) {
        setName(data.name || '');
        setPhone(data.phone || '');
        setAvatar(data.avatar || null);
      }

      if (error) console.error('Erreur chargement profil :', error.message);
    };

    fetchProfile();
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);

    let avatarUrl = avatar;

    // Upload avatar if changed
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${user.id}/${user.id}.${fileExt}`; // Store in user-specific folder

      try {
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        avatarUrl = publicUrlData.publicUrl;
      } catch (error) {
        console.error('Avatar upload error:', error);
        setMessage("Échec de l'upload de l'avatar.");
        setLoading(false);
        return;
      }
    }

    // Update profile
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name, 
          phone, 
          avatar: avatarUrl 
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setMessage("Profil mis à jour avec succès !");
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage("Erreur lors de la sauvegarde du profil.");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Mon Profil</h1>

      {message && (
        <div className={`mb-4 text-sm p-2 rounded ${
          message.includes('succès') 
            ? 'text-green-600 bg-green-100' 
            : 'text-red-600 bg-red-100'
        }`}>
          {message}
        </div>
      )}

      <div className="flex flex-col items-center mb-6">
        {avatar ? (
          <img
            src={avatar}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover mb-2"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-2">
            Aucun avatar
          </div>
        )}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleAvatarChange}
          className="mt-2" 
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Téléphone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="text"
            value={user?.email}
            readOnly
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-sm cursor-not-allowed"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm text-gray-700"
        >
          Retour
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;