import { useState, useEffect } from 'react';
import { Users, GraduationCap, ArrowUpRight, BookOpen as BookOpenIcon } from 'lucide-react';
import '../../styles/dashboard.css';
import { api } from '../../services/api';

export default function SecretariaPortal() {
  const [stats, setStats] = useState({
    totalAlunos: 0,
    totalTurmas: 0,
    totalDisciplinas: 0,
    overallAverage: null as number | null,
  });
  const [recentActivity, setRecentActivity] = useState<Array<{ 
    _id: string; 
    value: number; 
    createdAt: string;
    alunoId?: { name: string }; 
    disciplinaId?: { name: string }; 
  }>>([]);
  const [turmas, setTurmas] = useState<Array<{
    _id: string;
    name: string;
    isActive: boolean;
    periodo: string;
    year: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, turmasRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/turmas')
        ]);
        
        if (dashRes.data.success) {
          setStats(dashRes.data.data.kpis);
          setRecentActivity(dashRes.data.data.recentActivity);
        }
        
        if (turmasRes.data.success) {
          setTurmas(turmasRes.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <>
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient">Command Center</h1>
        <p className="text-secondary">Visão Estratégica da Instituição de Ensino</p>
      </div>

      {/* KPI GLASS CARDS */}
      <div className="stats-grid fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="glass-panel stat-card">
          <div className="stat-card-title"><Users size={16} className="text-blue-400" /> Turmas Hospedadas</div>
          <div className="stat-card-value">{loading ? '...' : stats.totalTurmas}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-card-title"><GraduationCap size={16} className="text-purple-400" /> Total de Alunos</div>
          <div className="stat-card-value">{loading ? '...' : stats.totalAlunos}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-card-title"><ArrowUpRight size={16} className="text-emerald-400" /> Média Geral</div>
          <div className="stat-card-value">{loading ? '...' : (stats.overallAverage !== null ? stats.overallAverage.toFixed(1) : '-')}</div>
        </div>
      </div>

      {/* VERCEL STYLE BLOCK CARDS: TURMAS */}
      <div className="dashboard-section fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="section-header">
          <h2>Núcleos de Aprendizagem</h2>
          <button className="btn-primary">Novo Núcleo</button>
        </div>
        
        <div className="blocks-grid">
          {loading ? (
            <p style={{ color: '#888' }}>Carregando dados da API...</p>
          ) : turmas.length === 0 ? (
            <p style={{ color: '#888' }}>Nenhuma turma cadastrada neste ambiente.</p>
          ) : (
            turmas.map((turma) => (
              <div key={turma._id} className="block-card">
                <div className="block-header">
                  <h3>{turma.name}</h3>
                  <span className={`status-pill ${turma.isActive ? 'active' : ''}`}>
                    {turma.isActive ? 'Operante' : 'Inativo'}
                  </span>
                </div>
                
                <div className="block-meta">
                  <div className="meta-item">
                     <Users size={16} className="text-gray-400"/>
                     {turma.periodo}
                  </div>
                  <div className="meta-item">
                     <BookOpenIcon size={16} className="text-gray-400" />
                     Ciclo: Letivo {turma.year}
                  </div>
                </div>

                <div className="block-footer">
                  <span style={{ color: 'hsl(var(--clr-cyan))', fontWeight: 500, cursor: 'pointer' }}>Configurar &rarr;</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY TABLE */}
      <div className="dashboard-section fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="section-header">
          <h2>Lançamentos Recentes de Notas</h2>
        </div>
        <div className="table-container">
          <div className="glass-panel" style={{ padding: '0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Disciplina</th>
                  <th>Data</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>Carregando...</td></tr>
                ) : recentActivity.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>Nenhum lançamento recente.</td></tr>
                ) : (
                  recentActivity.map((activity) => (
                    <tr key={activity._id}>
                      <td>{activity.alunoId?.name || 'Desconhecido'}</td>
                      <td>{activity.disciplinaId?.name || 'Desconhecida'}</td>
                      <td>{new Date(activity.createdAt).toLocaleDateString()}</td>
                      <td><strong style={{ color: (activity.value ?? 0) >= 6 ? 'hsl(var(--clr-cyan))' : 'hsl(var(--clr-alert))' }}>{activity.value != null ? activity.value.toFixed(1) : '--'}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
