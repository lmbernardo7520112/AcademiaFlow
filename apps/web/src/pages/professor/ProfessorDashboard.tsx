import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { BookOpen, Users, ArrowRight, BarChart3 } from 'lucide-react';
import { reportsService } from '../../services/reports.service.js';
import { ProfessorAnalyticsHeader } from '../../components/dashboard/ProfessorAnalyticsHeader.js';
import type { ProfessorAnalytics } from '@academiaflow/shared';
import '../../styles/dashboard.css';

interface Discipline {
  _id: string;
  name: string;
  codigo: string;
  turmaId?: {
    _id: string;
    name: string;
  };
  cargaHoraria: number;
}

const ProfessorDashboard: React.FC = () => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [analytics, setAnalytics] = useState<ProfessorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [disciplinesRes, analyticsRes] = await Promise.all([
          api.get('/professor/disciplinas'),
          reportsService.getProfessorAnalytics()
        ]);
        
        if (disciplinesRes.data.success) setDisciplines(disciplinesRes.data.data);
        setAnalytics(analyticsRes);
      } catch (error) {
        console.error('Erro ao carregar dashboard', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-overlay">Carregando sua jornada...</div>;

  return (
    <div className="professor-dashboard">
      <div className="dashboard-header fade-in flex justify-between items-end mb-8">
        <div>
          <h1 className="text-gradient text-4xl font-bold">Painel do Professor</h1>
          <p className="text-secondary">Visão analítica de performance e gestão de turmas.</p>
        </div>
        <div className="hidden md:block">
          <div className="flex items-center space-x-2 text-xs text-gray-500 uppercase tracking-tighter">
            <BarChart3 size={14} />
            <span>Telemetria em Tempo Real</span>
          </div>
        </div>
      </div>

      {analytics && <ProfessorAnalyticsHeader data={analytics} />}

      <div className="dashboard-section fade-in">
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl font-semibold text-white flex items-center gap-2">
             <BookOpen size={20} className="text-blue-400" />
             Minhas Disciplinas
           </h2>
        </div>
        {disciplines.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
             <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
             <p>Você ainda não possui disciplinas atribuídas.</p>
          </div>
        ) : (
          <div className="disciplines-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {disciplines.map(disc => (
              <div key={disc._id} className="glass-panel discipline-card hover-lift">
                <div className="card-header">
                  <div className="discipline-code">{disc.codigo}</div>
                  <h3 className="discipline-name">{disc.name}</h3>
                </div>
                
                <div className="card-content">
                  <div className="info-row">
                     <Users size={16} />
                     <span>{disc.turmaId?.name || 'Sem turma vinculada'}</span>
                  </div>
                  <div className="info-row">
                     <BookOpen size={16} />
                     <span>{disc.cargaHoraria}h totais</span>
                  </div>
                </div>

                <div className="card-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                   <button 
                    className="btn-primary flex-center gap-2" 
                    style={{ width: '100%' }}
                    onClick={() => navigate(`/professor/notas/${disc.turmaId?._id}/${disc._id}`)}
                   >
                     Gerenciar Notas <ArrowRight size={16} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessorDashboard;
