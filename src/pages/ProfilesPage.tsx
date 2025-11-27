// ProfilesPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit, RefreshCcw } from 'lucide-react';

type Profile = {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  role?: string | null;
  status?: boolean | null;
  email?: string | null; // si tu as relation avec auth.users
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<null | Profile>(null);
  const [showForm, setShowForm] = useState(false);
  const [roles, setRoles] = useState<{ id:number, name:string }[]>([]);
  // pagination
  const [page, setPage] = useState(1);
  const perPage = 12;

  useEffect(() => {
    fetchRoles();
    fetchProfiles();
  }, [page]);

  async function fetchRoles() {
    const { data, error } = await supabase.from('roles').select('id,name').order('id');
    if (!error && data) setRoles(data);
  }

  async function fetchProfiles() {
    setLoading(true);
    // exemple: selection simple ; si tu as relation vers auth.users et emails, jointure peut être ajoutée
    const from = (page - 1) * perPage;
    let q = supabase.from('profiles').select('*').order('name', { ascending: true }).range(from, from + perPage -1);
    if (query.trim()) q = supabase.from('profiles').select('*').ilike('name', `%${query}%`).order('name').range(from, from+perPage-1);
    const { data, error } = await q;
    if (error) console.error(error);
    else setProfiles(data || []);
    setLoading(false);
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
    // inverse status
    const { data, error } = await supabase.from('profiles').update({ status: !p.status }).eq('id', p.id).select().single();
    if (error) return alert('Erreur: ' + error.message);
    setProfiles((ps) => ps.map(x => x.id === p.id ? data : x));
  }

  async function deleteProfile(p: Profile) {
    if (!confirm('Supprimer ce profil ?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', p.id);
    if (error) return alert('Erreur: ' + error.message);
    setProfiles(ps => ps.filter(x => x.id !== p.id));
  }

  async function sendResetEmail(p: Profile) {
    // Pour envoyer mail de reset, il faut l'email de l'utilisateur
    if (!p.email) return alert('Cet utilisateur n\'a pas d\'email enregistré.');
    const { error } = await supabase.auth.resetPasswordForEmail(p.email);
    if (error) return alert('Erreur en envoyant le mail: ' + error.message);
    alert('Email de réinitialisation envoyé.');
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Gestion des Profils</h2>
        <div className="flex items-center gap-2">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Rechercher..." className="px-3 py-2 border rounded" />
          <button onClick={()=>fetchProfiles()} className="px-3 py-2 border rounded"><RefreshCcw size={16} /></button>
          <button onClick={openNew} className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded"><Plus size={14}/> Nouveau</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {profiles.map(p => (
          <div key={p.id} className="border rounded p-3 flex flex-col">
            <div className="flex items-center gap-3">
              <img src={p.avatar || '/avatar-placeholder.png'} className="w-12 h-12 rounded-full object-cover" alt="avatar" />
              <div className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-500">{p.phone || ''}</div>
                <div className="text-sm">{p.role}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={()=>openEdit(p)} className="px-2 py-1 border rounded flex items-center gap-2"><Edit size={14}/> Éditer</button>
                <button onClick={()=>toggleStatus(p)} className={`px-2 py-1 border rounded ${p.status ? 'bg-green-50' : 'bg-red-50'}`}>
                  {p.status ? 'Actif' : 'Désactivé'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={()=>sendResetEmail(p)} className="px-2 py-1 border rounded text-sm">Reset email</button>
                <button onClick={()=>deleteProfile(p)} className="px-2 py-1 border rounded text-error-600"><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div>
          <button onClick={()=>setPage(Math.max(1,page-1))} className="px-3 py-1 border rounded mr-2">Prev</button>
          <button onClick={()=>setPage(page+1)} className="px-3 py-1 border rounded">Next</button>
        </div>
        <div className="text-sm text-gray-500">{loading ? 'Chargement...' : ''}</div>
      </div>

      {showForm && <ProfileForm
        onClose={()=>{ setShowForm(false); fetchProfiles(); }}
        editing={editing}
        roles={roles}
      />}
    </div>
  );
}

/* ProfileForm component - simple modal form */
function ProfileForm({ editing, onClose, roles }:{ editing: any, onClose: ()=>void, roles:any[] }) {
  const [name,setName] = useState(editing?.name || '');
  const [phone,setPhone] = useState(editing?.phone || '');
  const [role,setRole] = useState<number | string>(editing?.role || '');
  const [avatarFile,setAvatarFile] = useState<File | null>(null);
  const [status,setStatus] = useState<boolean>(editing?.status ?? true);
  const [loading,setLoading] = useState(false);

  async function uploadAvatar(file: File, profileId: string) {
    const fileName = `${profileId}_${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (error) throw error;
    const url = (await supabase.storage.from('avatars').getPublicUrl(data.path)).data.publicUrl;
    return url;
  }

  async function save() {
    setLoading(true);
    try {
      if (editing) {
        let updates: any = { name, phone, status };
        // role: if you use user_roles table instead, call that endpoint
        updates.role = role;

        const { data, error } = await supabase.from('Profiles').update(updates).eq('id', editing.id).select().single();
        if (error) throw error;

        if (avatarFile) {
          const avatarUrl = await uploadAvatar(avatarFile, editing.id);
          await supabase.from('profiles').update({ avatar: avatarUrl }).eq('id', editing.id);
        }
      } else {
        // create new user: typically you also create auth user (signup), here we create Profiles only
        const id = crypto.randomUUID(); // or let supabase generate uuid in db
        const { data, error } = await supabase.from('profiles').insert({ id, name, phone, role, status }).select().single();
        if (error) throw error;
        if (avatarFile) {
          const avatarUrl = await uploadAvatar(avatarFile, data.id);
          await supabase.from('profiles').update({ avatar: avatarUrl }).eq('id', data.id);
        }
      }
      onClose();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded p-4 w-full max-w-xl">
        <h3 className="font-medium mb-3">{editing ? 'Modifier profil' : 'Nouveau profil'}</h3>
        <div className="grid grid-cols-1 gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} className="px-3 py-2 border rounded" placeholder="Nom complet" />
          <input value={phone} onChange={e=>setPhone(e.target.value)} className="px-3 py-2 border rounded" placeholder="Téléphone" />
          <select value={role} onChange={e=>setRole(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">-- Choisir rôle --</option>
            {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <input type="file" onChange={(e)=> setAvatarFile(e.target.files?.[0] || null)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={status} onChange={e=>setStatus(e.target.checked)} />
              Actif
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button onClick={onClose} className="px-3 py-1 border rounded">Annuler</button>
            <button onClick={save} disabled={loading} className="px-3 py-1 bg-primary-500 text-white rounded">{loading ? 'En cours...' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
