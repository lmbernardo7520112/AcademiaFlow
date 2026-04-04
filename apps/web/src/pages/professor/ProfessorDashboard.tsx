import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { BookOpen, Users, ArrowRight, Filter } from 'lucide-react';
import { reportsService } from '../../services/reports.service.js';
import { ProfessorAnalyticsHeader } from '../../components/dashboard/ProfessorAnalyticsHeader.js';
import type { ProfessorAnalytics } from '@academiaflow/shared';
import '../../styles/dashboard.css';

interface Discipline {
  _id: string;
  name: string;
  codigo: string;
  turmaIds: Array<{
    _id: string;
    name: string;
  }>;
  cargaHoraria: number;
}

const ProfessorDashboard: React.FC = () => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [analytics, setAnalytics] = useState<ProfessorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const navigate = useNavigate();

  // Get unique turmas from disciplines for the selector
  const availableTurmas = useMemo(() => {
    const map = new Map();
    disciplines.forEach(d => {
      d.turmaIds?.forEach(t => {
        if (!map.has(t._id)) map.set(t._id, t.name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [disciplines]);

  const fetchData = async (turmaId?: string) => {
    setLoading(true);
    try {
      const [disciplinesRes, analyticsRes] = await Promise.all([
        api.get('/professor/disciplinas'),
        reportsService.getProfessorAnalytics(turmaId)
      ]);
      
      if (disciplinesRes.data.success) setDisciplines(disciplinesRes.data.data);
      setAnalytics(analyticsRes);
    } catch (error) {
      console.error('Erro ao carregar dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedTurmaId || undefined);
  }, [selectedTurmaId]);

  const handleTurmaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTurmaId(e.target.value);
  };

  if (loading && !analytics) return <div className="loading-overlay">Carregando sua jornada...</div>;

  return (
    <div className="professor-dashboard">
      <div className="dashboard-header fade-in flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-gradient text-4xl font-bold">Painel do Professor</h1>
          <p className="text-secondary">Visão analítica de performance e gestão contextual.</p>
        </div>
        
        <div className="flex items-center gap-3 glass-panel" style={{ padding: '0.5rem 1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <Filter size={16} className="text-blue-400" />
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest hidden sm:inline">Contexto:</span>
          <select 
            value={selectedTurmaId} 
            onChange={handleTurmaChange}
            className="bg-transparent text-white border-none focus:ring-0 text-sm font-semibold cursor-pointer"
            style={{ minWidth: '150px' }}
          >
            <option value="" className="bg-slate-900 text-gray-400">Ver Todas as Turmas</option>
            {availableTurmas.map(t => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {analytics && <ProfessorAnalyticsHeader data={analytics} />}

      <div className="dashboard-section fade-in">
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl font-semibold text-white flex items-center gap-2">
             <BookOpen size={20} className="text-blue-400" />
             Atribuições Curriculares
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {disciplines
              .filter(d => !selectedTurmaId || d.turmaIds.some(t => t._id === selectedTurmaId))
              .map(disc => (
              <div key={disc._id} className="glass-panel discipline-card hover-lift">
                <div className="card-header" style={{ marginBottom: '1rem' }}>
                  <div className="discipline-code">{disc.codigo}</div>
                  <h3 className="discipline-name" style={{ fontSize: '1.25rem' }}>{disc.name}</h3>
                </div>
                
                <div className="card-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="info-row">
                     <Users size={16} />
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {disc.turmaIds?.map(t => (
                        <span key={t._id} className="status-pill" style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.1rem 0.4rem', 
                          backgroundColor: selectedTurmaId === t._id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                          color: selectedTurmaId === t._id ? '#60a5fa' : '#94a3b8'
                        }}>
                          {t.name}
                        </span>
                      ))}
                     </div>
                  </div>
                  <div className="info-row">
                     <BookOpen size={16} />
                     <span>{disc.cargaHoraria}h totais</span>
                  </div>
                </div>

                <div className="card-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                   <button 
                    className="btn-primary flex-center gap-2" 
                    style={{ width: '100%', padding: '0.75rem' }}
                    onClick={() => {
                      const tId = selectedTurmaId || disc.turmaIds[0]?._id;
                      if (tId) navigate(`/professor/notas/${tId}/${disc._id}`);
                      else alert('Selecione uma turma para gerenciar notas.');
                    }}
                   >
                     Gerenciar Turma <ArrowRight size={16} />
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
