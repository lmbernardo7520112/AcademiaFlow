import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * RoleRedirect Component
 * Responsible for redirecting the user to the correct dashboard based on their role.
 * Part of Specification: Role-Based Routing & Redirection (v2)
 */
const RoleRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { replace: true });
      return;
    }

    if (!user) return;

    // Redirection Logic according to spec_phase1_rbac.md
    switch (user.role) {
      case 'professor':
        navigate('/professor', { replace: true });
        break;
      case 'secretaria':
      case 'admin':
      case 'administrador':
        navigate('/secretaria', { replace: true });
        break;
      default:
        navigate('/auth/login', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'var(--bg-deep)',
      color: 'var(--text-primary)'
    }}>
      <div className="loading-spinner">Carregando...</div>
    </div>
  );
};

export default RoleRedirect;
