import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

import { supabase } from '@/lib/supabase';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
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
      <div className="mb-8 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 transition-colors duration-300">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Thème</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'light' ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-slate-400" />
            )}
            <span className="text-gray-700 dark:text-gray-300">
              Mode {theme === 'light' ? 'Clair' : 'Sombre'}
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${
              theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'
            }`}
            aria-label="Basculer le thème"
          >
            <span
              className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                theme === 'dark' ? 'translate-x-8' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Section : Notifications */}
      <div className="mb-8 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 transition-colors duration-300">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Notifications</h2>
        <label className="flex items-center space-x-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
              className="sr-only"
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors duration-300 ${
                notifications ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                notifications ? 'translate-x-4' : ''
              }`}
            />
          </div>
          <span className="text-gray-700 dark:text-gray-300">Activer les notifications par email</span>
        </label>
      </div>

      {/* Section : Changement de mot de passe */}
      <div className="mb-8 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 transition-colors duration-300">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Changer le mot de passe</h2>
        <Input
          type="password"
          placeholder="Nouveau mot de passe"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mb-4 dark:bg-slate-700 dark:border-gray-600 dark:text-white"
        />
        <Button onClick={handlePasswordChange} className="dark:bg-blue-600 dark:hover:bg-blue-700">Mettre à jour</Button>
        {message && (
          <p className={`text-sm mt-4 p-3 rounded ${
            message.includes('succès')
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
