import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redireciona para o login e preserva a rota de origem para tentar voltar após sucesso
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Se autenticado, renderiza as rotas filhas (Dashboard, etc.)
  return <Outlet />;
}
