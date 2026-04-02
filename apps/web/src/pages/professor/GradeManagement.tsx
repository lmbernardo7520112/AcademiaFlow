import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { 
  calculateNF, 
  determineSituacao, 
  calculateMF 
} from '@academiaflow/shared';
import { Save, ArrowLeft, RefreshCcw } from 'lucide-react';
import '../../styles/dashboard.css';

interface BoletimEntry {
  alunoId: string;
  alunoName: string;
  matricula: string;
  notas: {
    bimestre1: number | null;
    bimestre2: number | null;
    bimestre3: number | null;
    bimestre4: number | null;
    pf?: number | null;
  };
  nf: number | null;
  mg: number | null;
  mf: number | null;
  situacao: string;
}

const GradeManagement: React.FC = () => {
  const { turmaId, disciplinaId } = useParams<{ turmaId: string; disciplinaId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boletins, setBoletins] = useState<BoletimEntry[]>([]);
  const [year] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/notas/boletim/${turmaId}/${disciplinaId}?year=${year}`);
      if (data.success) {
        setBoletins(data.data);
      }
    } catch (error: any) {
      console.error('Erro ao buscar boletim:', error.message);
    } finally {
      setLoading(false);
    }
  }, [turmaId, disciplinaId, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGradeChange = (alunoId: string, bimesterKey: keyof BoletimEntry['notas'], value: string) => {
    const val = value === '' ? null : parseFloat(value);
    
    setBoletins(prev => prev.map(b => {
      if (b.alunoId === alunoId) {
        const updatedNotas = { ...b.notas, [bimesterKey]: val };
        
        // Recalculate on the fly using shared logic
        const bValues = [updatedNotas.bimestre1, updatedNotas.bimestre2, updatedNotas.bimestre3, updatedNotas.bimestre4];
        const nf = calculateNF(bValues);
        const situacao = determineSituacao(nf, updatedNotas.pf);
        const mf = updatedNotas.pf != null ? calculateMF(nf, updatedNotas.pf) : null;

        return { ...b, notas: updatedNotas, nf, situacao, mf };
      }
      return b;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert current state to bulk payload
      const payload: any[] = [];
      boletins.forEach(b => {
        Object.entries(b.notas).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            const bimesterNum = key === 'pf' ? 5 : parseInt(key.replace('bimestre', ''));
            payload.push({
              alunoId: b.alunoId,
              turmaId,
              disciplinaId,
              year,
              bimester: bimesterNum,
              value: val
            });
          }
        });
      });

      await api.post('/notas/bulk', payload);
      alert('Notas salvas com sucesso!');
    } catch (error) {
      alert('Erro ao salvar notas.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-overlay">Carregando Diário...</div>;

  return (
    <div className="grade-management-page">
      <div className="dashboard-header fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-gradient">Diário de Classe</h1>
            <p className="text-secondary">Gestão centralizada de notas e acompanhamento pedagógico.</p>
          </div>
        </div>
        <div className="header-actions">
           <button className="btn-secondary flex-center gap-2" onClick={fetchData}><RefreshCcw size={16} /> Recarregar</button>
           <button className="btn-primary flex-center gap-2" onClick={handleSave} disabled={saving}>
             <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
           </button>
        </div>
      </div>

      <div className="dashboard-section fade-in">
        <div className="glass-panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table grade-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th style={{ width: '80px' }}>B1</th>
                <th style={{ width: '80px' }}>B2</th>
                <th style={{ width: '80px' }}>B3</th>
                <th style={{ width: '80px' }}>B4</th>
                <th style={{ width: '80px', background: 'rgba(255,255,255,0.02)' }}>NF</th>
                <th style={{ width: '80px' }}>PF</th>
                <th style={{ width: '80px', background: 'rgba(255,255,255,0.02)' }}>MF</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {boletins.map(b => (
                <tr key={b.alunoId}>
                  <td className="aluno-cell">
                    <div className="aluno-name">{b.alunoName}</div>
                    <div className="aluno-matricula">{b.matricula}</div>
                  </td>
                  <td>
                    <input type="number" step="0.1" min="0" max="10" 
                      value={b.notas.bimestre1 ?? ''} 
                      onChange={e => handleGradeChange(b.alunoId, 'bimestre1', e.target.value)} 
                    />
                  </td>
                  <td>
                    <input type="number" step="0.1" min="0" max="10" 
                      value={b.notas.bimestre2 ?? ''} 
                      onChange={e => handleGradeChange(b.alunoId, 'bimestre2', e.target.value)} 
                    />
                  </td>
                  <td>
                    <input type="number" step="0.1" min="0" max="10" 
                      value={b.notas.bimestre3 ?? ''} 
                      onChange={e => handleGradeChange(b.alunoId, 'bimestre3', e.target.value)} 
                    />
                  </td>
                  <td>
                    <input type="number" step="0.1" min="0" max="10" 
                      value={b.notas.bimestre4 ?? ''} 
                      onChange={e => handleGradeChange(b.alunoId, 'bimestre4', e.target.value)} 
                    />
                  </td>
                  <td className="calculated-cell">{b.nf ?? '-'}</td>
                  <td>
                    <input type="number" step="0.1" min="0" max="10" 
                      value={b.notas.pf ?? ''} 
                      onChange={e => handleGradeChange(b.alunoId, 'pf', e.target.value)} 
                      disabled={b.nf !== null && b.nf >= 6} 
                    />
                  </td>
                  <td className="calculated-cell">{b.mf ?? '-'}</td>
                  <td>
                    <span className={`badge-status ${b.situacao.toLowerCase()}`}>
                      {b.situacao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GradeManagement;
