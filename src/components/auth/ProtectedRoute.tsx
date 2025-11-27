import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";


interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Liste des rôles autorisés (optionnel)
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Rediriger si l'utilisateur n'est pas connecté
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Rediriger si le rôle de l'utilisateur n'est pas autorisé
  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
