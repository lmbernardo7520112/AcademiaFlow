import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { isSelfServiceEnabled } from './config/appMode';
import ErrorBoundary from './components/ErrorBoundary';

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
import TurmaAnalyticsPage from './pages/dashboard/TurmaAnalyticsPage';
import BoletimIndividualPage from './pages/dashboard/BoletimIndividualPage';
import BoletimLotePage from './pages/dashboard/BoletimLotePage';
import BuscaAtivaPage from './pages/dashboard/busca-ativa/BuscaAtivaPage';
import DashboardLayout from './components/layout/DashboardLayout';

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={
            isSelfServiceEnabled ? <Register /> : <Navigate to="/auth/login" replace />
          } />
          
          {/* Jornada do Professor */}
          <Route element={<ProtectedRoute allowedRoles={['professor']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/professor" element={<ProfessorDashboard />} />
              <Route path="/professor/turma/:turmaId" element={<TurmaAnalyticsPage />} />
              <Route path="/professor/notas/:turmaId/:disciplinaId" element={<GradeManagement />} />
              <Route path="/professor/ai" element={<ProfessorAI />} />
            </Route>
          </Route>

          {/* Jornada da Secretaria/Admin */}
          <Route element={<ProtectedRoute allowedRoles={['secretaria', 'admin', 'administrador']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/secretaria" element={<SecretariaDashboard />} />
              <Route path="/secretaria/turmas" element={<TurmasPage />} />
              <Route path="/secretaria/turma/:turmaId" element={<TurmaAnalyticsPage />} />
              <Route path="/secretaria/alunos" element={<AlunosPage />} />
              <Route path="/secretaria/disciplinas" element={<DisciplinasPage />} />
              <Route path="/secretaria/busca-ativa" element={<BuscaAtivaPage />} />
            </Route>
          </Route>

          {/* Compartilhado (Boletim) */}
          <Route element={<ProtectedRoute allowedRoles={['professor', 'secretaria', 'admin', 'administrador']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard/alunos/:alunoId/boletim" element={<BoletimIndividualPage />} />
              <Route path="/dashboard/turmas/:turmaId/boletins" element={<BoletimLotePage />} />
            </Route>
          </Route>

          {/* Fallback & Parity Drifts */}
          <Route path="/professor/notas" element={<Navigate to="/professor" replace />} />
          <Route path="/dashboard/*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App;
