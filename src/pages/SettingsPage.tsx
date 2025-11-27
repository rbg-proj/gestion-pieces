import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from "@/hooks/useAuth";

import { supabase } from '@/lib/supabase';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState(true);

  const handlePasswordChange = async () => {
    setMessage(null);
    if (!newPassword) {
      setMessage('Le nouveau mot de passe est requis.');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setMessage('Mot de passe mis à jour avec succès.');
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      {/* Section : Thème */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Thème</h2>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
          className="border rounded px-3 py-2"
        >
          <option value="light">Clair</option>
          <option value="dark">Sombre</option>
        </select>
      </div>

      {/* Section : Notifications */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Notifications</h2>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={notifications}
            onChange={() => setNotifications(!notifications)}
          />
          <span>Activer les notifications par email</span>
        </label>
      </div>

      {/* Section : Changement de mot de passe */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Changer le mot de passe</h2>
        <Input
          type="password"
          placeholder="Nouveau mot de passe"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mb-2"
        />
        <Button onClick={handlePasswordChange}>Mettre à jour</Button>
        {message && <p className="text-sm mt-2 text-gray-700">{message}</p>}
      </div>
    </div>
  );
};

export default SettingsPage;
