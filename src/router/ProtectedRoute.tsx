import { Navigate } from 'react-router-dom';
import { getToken } from '../services/authStorage';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = getToken();

  if (!token) {
    // Redireciona de volta ao login se o usuário não tem token
    return <Navigate to="/login" replace />;
  }

  // Se tem token, autoriza a renderização do componente filho (tela protegida)
  return <>{children}</>;
}
