import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Users, 
  TrendingUp, 
  PieChart, 
  BookOpen, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import '../../styles/dashboard.css';

interface DashboardKPIs {
  totalAlunos: number;
  ativos: number;
  inativos: number;
  evadidos: number;
  occupancyRate: number;
  overallAverage: number;
  totalTurmas: number;
  totalDisciplinas: number;
}

interface RecentActivity {
  _id: string;
  value: number;
  alunoId?: { name: string };
  disciplinaId?: { name: string };
}

const SecretariaDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<{ kpis: DashboardKPIs, recentActivity: RecentActivity[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await api.get('/reports/dashboard');
        if (data.success) {
          setMetrics(data.data);
        }
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        console.error('Erro ao carregar métricas', err);
        // Garantir que não crashamos a tela, mas mostramos o estado honesto de erro.
        if (err?.response?.status === 401) {
          setMetrics(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="loading-overlay">Sincronizando Métricas...</div>;
  if (!metrics) return <div>Erro ao carregar dados.</div>;

  const kpis = metrics.kpis;
  
  // Guardas preventivas contra divisões por zero ou dados ausentes que causam NaN e crasham o gráfico
  const totalAlunosValidos = Math.max(kpis?.totalAlunos ?? 1, 1);
  const taxaRetencao = ((kpis?.ativos ?? 0) / totalAlunosValidos * 100).toFixed(1);

  const cards = [
    { label: 'Alunos Ativos', value: kpis?.ativos ?? 0, icon: Users, color: '#10b981', suffix: '' },
    { label: 'Retenção', value: `${taxaRetencao}%`, icon: TrendingUp, color: '#8b5cf6', suffix: '' },
    { label: 'Ocupação', value: `${kpis?.occupancyRate ?? 0}%`, icon: PieChart, color: '#f59e0b', suffix: '' },
    { label: 'Média Geral', value: kpis?.overallAverage || 'N/A', icon: Activity, color: '#ec4899', suffix: '' },
    { label: 'Cursos/Turmas', value: `${kpis?.totalDisciplinas ?? 0} / ${kpis?.totalTurmas ?? 0}`, icon: BookOpen, color: '#06b6d4', suffix: '' },
  ];

  return (
    <div className="secretaria-dashboard">
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient">Painel Estratégico</h1>
        <p className="text-secondary">Visão consolidada da operação e saúde acadêmica da instituição.</p>
      </div>

      <div className="kpi-grid fade-in" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {cards.map((card, idx) => (
          <div key={idx} className="glass-panel kpi-card hover-lift" style={{ borderLeft: `4px solid ${card.color}` }}>
            <div className="kpi-icon" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
               <card.icon size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">{card.label}</span>
              <h2 className="kpi-value">{card.value}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-layout-rows fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
         <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem' }}>Atividade Recente (Notas)</h3>
            {metrics.recentActivity.length === 0 ? (
               <p className="text-secondary">Nenhuma atividade recente registrada.</p>
            ) : (
               <div className="activity-list">
                 {metrics.recentActivity.map((grade) => (
                     <div key={grade._id} className="activity-item" style={{ 
                      padding: '1rem 0', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                       <div>
                          <strong>{grade.alunoId?.name}</strong> em <span className="text-primary">{grade.disciplinaId?.name}</span>
                       </div>
                       <div className="grade-badge" style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '6px', 
                          fontWeight: 'bold',
                          background: (grade?.value ?? 0) >= 6 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: (grade?.value ?? 0) >= 6 ? '#10b981' : '#ef4444'
                       }}>
                          {grade?.value?.toFixed(1) ?? '0.0'}
                       </div>
                    </div>
                 ))}
               </div>
            )}
         </div>

         <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' }}>
            <h3>Status de Evasão</h3>
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
               <div className="evasao-stat">
                  <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>{kpis?.evadidos ?? 0}</span>
                  <p className="text-secondary">Alunos Evadidos este ano</p>
               </div>
               
               <div style={{ marginTop: '2rem' }}>
                  {(kpis?.evadidos ?? 0) > 5 ? (
                     <div className="alert-warning flex-center gap-2" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                        <ArrowUpRight size={20} /> Alerta crítico de evasão detectado.
                     </div>
                  ) : (
                     <div className="alert-success flex-center gap-2" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                        <ArrowDownRight size={20} /> Taxas de retenção estáveis.
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SecretariaDashboard;
