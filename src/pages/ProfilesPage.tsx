import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit, RefreshCcw, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

type Profile = {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  role: string | null;
  status: boolean;
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<null | Profile>(null);
  const [showForm, setShowForm] = useState(false);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const perPage = 12;

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [page, query]);

  async function fetchRoles() {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .order('id');
      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des rôles:', err);
    }
  }

  async function fetchProfiles() {
    setLoading(true);
    try {
      const from = (page - 1) * perPage;
      let q = supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true })
        .range(from, from + perPage - 1);

      if (query.trim()) {
        q = supabase
          .from('profiles')
          .select('*')
          .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
          .order('name')
          .range(from, from + perPage - 1);
      }

      const { data, error } = await q;
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des profils:', err);
      toast.error('Erreur lors du chargement des profils');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setShowForm(true);
  }

  async function toggleStatus(p: Profile) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: !p.status })
        .eq('id', p.id);
      if (error) throw error;
      setProfiles((ps) =>
        ps.map((x) => (x.id === p.id ? { ...x, status: !x.status } : x))
      );
      toast.success(
        `Profil ${!p.status ? 'activé' : 'désactivé'} avec succès`
      );
    } catch (err: any) {
      console.error('Erreur lors de la modification du statut:', err);
      toast.error('Erreur lors de la modification du statut');
    }
  }

  async function deleteProfile(p: Profile) {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer le profil "${p.name}" ? Cette action est irréversible.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', p.id);
      if (error) throw error;
      setProfiles((ps) => ps.filter((x) => x.id !== p.id));
      toast.success('Profil supprimé avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      toast.error('Erreur lors de la suppression du profil');
    }
  }

  async function sendResetEmail(p: Profile) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(p.id);
      if (!authUser?.user?.email) {
        toast.error('Cet utilisateur n\'a pas d\'email enregistré');
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        authUser.user.email
      );
      if (error) throw error;
      toast.success('Email de réinitialisation envoyé avec succès');
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi du mail:', err);
      toast.error('Erreur lors de l\'envoi du mail de réinitialisation');
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestion des Profils
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez les utilisateurs et leurs rôles
            </p>
          </div>
          <Button
            onClick={openNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={18} />
            Nouveau Profil
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher par nom ou téléphone..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => fetchProfiles()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCcw
                size={18}
                className={loading ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {loading && profiles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin mr-2" />
              <span className="text-gray-600">Chargement des profils...</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 text-lg">
                {query ? 'Aucun profil trouvé' : 'Aucun profil enregistré'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={p.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&h=48&fit=crop'}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      alt={p.name || 'Avatar'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {p.name || 'Utilisateur'}
                      </div>
                      {p.phone && (
                        <div className="text-sm text-gray-600 truncate">
                          {p.phone}
                        </div>
                      )}
                      {p.role && (
                        <Badge
                          variant={
                            p.role === 'admin'
                              ? 'default'
                              : p.role === 'manager'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="mt-1"
                        >
                          {p.role}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant={p.status ? 'success' : 'secondary'}
                      className={
                        p.status
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {p.status ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Edit size={14} />
                      Éditer
                    </button>
                    <button
                      onClick={() => toggleStatus(p)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        p.status
                          ? 'border border-gray-300 hover:bg-red-50 text-gray-700'
                          : 'border border-gray-300 hover:bg-green-50 text-gray-700'
                      }`}
                    >
                      {p.status ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => deleteProfile(p)}
                      className="px-3 py-2 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {profiles.length > 0 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={profiles.length < perPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
              <span className="text-sm text-gray-600">
                Page {page}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <ProfileForm
          onClose={() => {
            setShowForm(false);
            fetchProfiles();
          }}
          editing={editing}
          roles={roles}
        />
      )}
    </div>
  );
}

function ProfileForm({
  editing,
  onClose,
  roles,
}: {
  editing: Profile | null;
  onClose: () => void;
  roles: { id: number; name: string }[];
}) {
  const [name, setName] = useState(editing?.name || '');
  const [phone, setPhone] = useState(editing?.phone || '');
  const [role, setRole] = useState(editing?.role || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(editing?.avatar || '');
  const [status, setStatus] = useState(editing?.status ?? true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    if (phone && !/^\d{10}$/.test(phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Le téléphone doit contenir 10 chiffres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, avatar: 'L\'image doit faire moins de 5MB' });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function uploadAvatar(file: File, profileId: string) {
    const fileName = `${profileId}_${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });
    if (error) throw error;
    const url = (
      await supabase.storage.from('avatars').getPublicUrl(data.path)
    ).data.publicUrl;
    return url;
  }

  async function save() {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (editing) {
        const updates: any = {
          name: name.trim(),
          phone: phone.trim() || null,
          role: role || null,
          status,
        };

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editing.id);
        if (error) throw error;

        if (avatarFile) {
          const avatarUrl = await uploadAvatar(avatarFile, editing.id);
          await supabase
            .from('profiles')
            .update({ avatar: avatarUrl })
            .eq('id', editing.id);
        }

        toast.success('Profil modifié avec succès');
      } else {
        const profileId = crypto.randomUUID();
        const { error } = await supabase.from('profiles').insert({
          id: profileId,
          name: name.trim(),
          phone: phone.trim() || null,
          role: role || null,
          status,
        });
        if (error) throw error;

        if (avatarFile) {
          const avatarUrl = await uploadAvatar(avatarFile, profileId);
          await supabase
            .from('profiles')
            .update({ avatar: avatarUrl })
            .eq('id', profileId);
        }

        toast.success('Profil créé avec succès');
      }
      onClose();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      toast.error(
        err.message || 'Erreur lors de la sauvegarde du profil'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {editing ? 'Modifier le profil' : 'Créer un nouveau profil'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="Nom complet"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                placeholder="Téléphone (10 chiffres)"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.phone && (
                <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choisir un rôle --</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avatar
              </label>
              {avatarPreview && (
                <div className="mb-2">
                  <img
                    src={avatarPreview}
                    alt="Aperçu"
                    className="h-20 w-20 rounded-full object-cover border border-gray-300"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="w-full text-sm text-gray-600 file:mr-2 file:px-3 file:py-1 file:border file:border-gray-300 file:rounded-lg file:text-sm file:cursor-pointer hover:file:bg-gray-50"
              />
              {errors.avatar && (
                <p className="text-red-600 text-sm mt-1">{errors.avatar}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="status"
                checked={status}
                onChange={(e) => setStatus(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="status" className="text-sm font-medium text-gray-700">
                Profil actif
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
