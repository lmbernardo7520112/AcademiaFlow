import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import LandingPage from './pages/marketing/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import SecretariaDashboard from './pages/dashboard/SecretariaDashboard';

import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRedirect from './components/auth/RoleRedirect';

import TurmasPage from './pages/dashboard/TurmasPage';
import AlunosPage from './pages/dashboard/AlunosPage';
import DisciplinasPage from './pages/dashboard/DisciplinasPage';
import ProfessorDashboard from './pages/professor/ProfessorDashboard';
import GradeManagement from './pages/professor/GradeManagement';
import ProfessorAI from './pages/professor/ProfessorAI';
import DashboardLayout from './components/layout/DashboardLayout';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          
          {/* Jornada do Professor */}
          <Route element={<ProtectedRoute allowedRoles={['professor']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/professor" element={<ProfessorDashboard />} />
              <Route path="/professor/notas/:turmaId/:disciplinaId" element={<GradeManagement />} />
              <Route path="/professor/ai" element={<ProfessorAI />} />
            </Route>
          </Route>

          {/* Jornada da Secretaria/Admin */}
          <Route element={<ProtectedRoute allowedRoles={['secretaria', 'admin', 'administrador']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/secretaria" element={<SecretariaDashboard />} />
              <Route path="/secretaria/turmas" element={<TurmasPage />} />
              <Route path="/secretaria/alunos" element={<AlunosPage />} />
              <Route path="/secretaria/disciplinas" element={<DisciplinasPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="/dashboard/*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App;
