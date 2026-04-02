import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { BookOpen, Users, ArrowRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const { data } = await api.get('/professor/disciplinas');
        if (data.success) {
          setDisciplines(data.data);
        }
      } catch (error) {
        console.error('Erro ao carregar disciplinas', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDisciplines();
  }, []);

  if (loading) return <div className="loading-overlay">Carregando sua jornada...</div>;

  return (
    <div className="professor-dashboard">
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient">Minhas Disciplinas</h1>
        <p className="text-secondary">Selecione uma disciplina para gerenciar notas e frequência.</p>
      </div>

      <div className="dashboard-section fade-in">
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
