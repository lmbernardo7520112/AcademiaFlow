import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import LandingPage from './pages/marketing/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import SecretariaPortal from './pages/dashboard/SecretariaPortal';

import ProtectedRoute from './components/auth/ProtectedRoute';

import TurmasPage from './pages/dashboard/TurmasPage';
import AlunosPage from './pages/dashboard/AlunosPage';
import DisciplinasPage from './pages/dashboard/DisciplinasPage';
import NotasPage from './pages/dashboard/NotasPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          
          {/* Rotas Privadas Governança */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<SecretariaPortal />} />
            <Route path="/dashboard/turmas" element={<TurmasPage />} />
            <Route path="/dashboard/alunos" element={<AlunosPage />} />
            <Route path="/dashboard/disciplinas" element={<DisciplinasPage />} />
            <Route path="/dashboard/notas" element={<NotasPage />} />
            {/* Future Routes */}
            {/* <Route path="/dashboard/ai" element={<ProfessorAI />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App;
