import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60000; // 60 secondes

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) {
      setIsLocked(true);
      const timeout = setTimeout(() => {
        setAttempts(0);
        setIsLocked(false);
      }, LOCK_DURATION_MS);
      return () => clearTimeout(timeout);
    }
  }, [attempts]);

 const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 4;
  
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (isLocked) return;

  const errors: { email?: string; password?: string } = {};
  if (!validateEmail(email)) errors.email = "Email invalide.";
  if (!validatePassword(password)) errors.password = "Le mot de passe doit contenir au moins 8 caractères.";

  setFormErrors(errors);
  if (Object.keys(errors).length > 0) return;

  try {
    const success = await login(email, password);
    if (success) {
      setAttempts(0);
      navigate('/');
    } else {
      setAttempts(prev => prev + 1);
    }
  } catch (err) {
    console.error(err);
    setAttempts(prev => prev + 1);
  }
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-600 flex justify-center items-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            <div className="flex justify-center mb-6">
              <div className="bg-primary-50 p-3 rounded-full">
                <ShoppingBag size={32} className="text-primary-500" />
              </div>
            </div>

            <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-2">Perfect TechSolutions</h2>
            <p className="text-center text-sm text-gray-600 mb-6">
              Connectez-vous pour continuer...
            </p>

            {(error || isLocked) && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md flex items-start">
                <AlertCircle size={16} className="text-error-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-error-700">
                  {isLocked
                    ? "Trop de tentatives. Réessayez dans quelques secondes."
                    : error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                {formErrors.email && <p className="mt-1 text-sm text-error-600">{formErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
                    placeholder="Entrez votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                {formErrors.password && <p className="mt-1 text-sm text-error-600">{formErrors.password}</p>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLocked}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Se souvenir de moi
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-150 ease-in-out"
                  disabled={loading || isLocked}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connexion en cours...
                    </span>
                  ) : 'Connexion'}
                </button>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 sm:px-10">
            {/* Footer ou lien mot de passe oublié ici */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
