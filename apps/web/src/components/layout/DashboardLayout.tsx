import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, BookOpen, UserSquare2, LogOut } from 'lucide-react';
import '../../styles/dashboard.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { path: '/dashboard/turmas', label: 'Gestão de Turmas', icon: Users },
    { path: '/dashboard/disciplinas', label: 'Mapeamento de Disciplinas', icon: BookOpen },
    { path: '/dashboard/alunos', label: 'Matrículas', icon: UserSquare2 },
  ];

  // Placeholder caso não tenha user logado ainda visualizando a pagina mock.
  const displayUser = user || { name: 'Maga McGonagall', role: 'secretaria' };

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="flow-dot"></div>
            <h2>AcademiaFlow</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <div 
                key={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                {item.label}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={handleLogout}>
            <LogOut size={18} />
            Desconectar Máquina
          </div>
        </div>
      </aside>

      {/* CORE WORKSPACE */}
      <main className="main-wrapper">
        <header className="topbar">
          <div className="user-profile">
            <div className="user-details">
              <div className="user-name">{displayUser.name}</div>
              <div className="user-role">{displayUser.role}</div>
            </div>
            <div className="avatar">
              {displayUser.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="content-canvas">
          {children}
        </div>
      </main>
    </div>
  );
}
