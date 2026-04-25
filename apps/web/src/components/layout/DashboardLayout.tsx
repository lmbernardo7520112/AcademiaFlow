import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, BookOpen, UserSquare2, LogOut, FileText, Cpu, Menu, X, ClipboardList, ArrowLeftRight } from 'lucide-react';
import '../../styles/dashboard.css';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/welcome');
  };

  // Dynamic Navigation Items based on SDD spec_phase1_rbac.md
  const allNavItems = [
    { path: '/secretaria', label: 'Visão Geral', icon: LayoutDashboard, roles: ['secretaria', 'admin', 'administrador'] },
    { path: '/secretaria/turmas', label: 'Gestão de Turmas', icon: Users, roles: ['secretaria', 'admin', 'administrador'] },
    { path: '/secretaria/disciplinas', label: 'Catálogo de Disciplinas', icon: BookOpen, roles: ['secretaria', 'admin', 'administrador'] },
    { path: '/secretaria/alunos', label: 'Matrículas de Alunos', icon: UserSquare2, roles: ['secretaria', 'admin', 'administrador'] },
    { path: '/secretaria/busca-ativa', label: 'Busca Ativa', icon: ClipboardList, roles: ['secretaria', 'admin', 'administrador'] },
    { path: '/secretaria/siage', label: 'SIAGE', icon: ArrowLeftRight, roles: ['secretaria', 'admin', 'administrador'] },
    { path: '/professor', label: 'Meus Diários / Notas', icon: FileText, roles: ['professor'] },
    { path: '/professor/ai', label: 'CoPilot Pedagógico', icon: Cpu, roles: ['professor'] },
  ];

  const userRole = user?.role || 'professor';
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  // Placeholder caso não tenha user logado ainda visualizando a pagina mock.
  const displayUser = user || { name: 'Usuário', role: 'professor' };

  return (
    <div className="dashboard-layout">
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={closeMobileMenu}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="flow-dot"></div>
            <h2>AcademiaFlow</h2>
          </div>
          <button className="mobile-close-btn" onClick={closeMobileMenu} aria-label="Fechar menu">
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <div
                key={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  closeMobileMenu();
                }}
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
          <button className="mobile-menu-toggle" onClick={toggleMobileMenu} aria-label="Abrir menu">
            <Menu size={24} />
          </button>
          
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
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
