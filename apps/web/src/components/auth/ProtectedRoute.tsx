import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redireciona para o login e preserva a rota de origem para tentar voltar após sucesso
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Verifica se o usuário tem a Role necessária (RBAC)
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Se não tiver permissão, redireciona para uma rota de unauthorized ou volta para a raiz
    return <Navigate to="/" replace />;
  }

  // Se autenticado e autorizado, renderiza as rotas filhas
  return <Outlet />;
}
