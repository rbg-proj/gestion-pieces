import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
     <AuthProvider>
    <App />
      </AuthProvider>
    <Toaster position="top-center" reverseOrder={false} />
  </>
);