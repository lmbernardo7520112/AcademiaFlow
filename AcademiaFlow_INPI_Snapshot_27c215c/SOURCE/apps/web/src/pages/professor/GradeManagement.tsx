import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { 
  calculateNF, 
  determineSituacao, 
  calculateMF 
} from '@academiaflow/shared';
import { 
  Save, 
  ArrowLeft, 
  Brain, 
  Zap, 
  X, 
  CheckCircle,
  FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
  const [selectedBimester, setSelectedBimester] = useState(1);
  
  // AI States
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiContent, setAiContent] = useState<string | Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }> | null>(null);
  const [aiType, setAiType] = useState<'ANALYSIS' | 'EXERCISES' | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/notas/boletim/${turmaId}/${disciplinaId}?year=${year}`);
      if (data.success) {
        setBoletins(data.data);
      }
    } catch (error: unknown) {
      console.error('Erro ao buscar boletim:', error instanceof Error ? error.message : 'Unknown error');
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
      const payload: Array<{ 
        alunoId: string; 
        turmaId: string | undefined; 
        disciplinaId: string | undefined; 
        year: number; 
        bimester: number; 
        value: number 
      }> = [];
      boletins.forEach(b => {
        Object.entries(b.notas).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            const bimesterNum = key === 'pf' ? 5 : parseInt(key.replace('bimestre', ''));
            payload.push({
              alunoId: b.alunoId, turmaId, disciplinaId, year, bimester: bimesterNum, value: val
            });
          }
        });
      });
      await api.post('/notas/bulk', payload);
      alert('Notas salvas com sucesso!');
    } catch {
      alert('Erro ao salvar notas.');
    } finally {
      setSaving(false);
    }
  };

  const handleAiAnalysis = async () => {
    setAiLoading(true);
    setAiType('ANALYSIS');
    try {
      const { data } = await api.post('/ai/pedagogical/analysis', {
        bimester: selectedBimester,
        year,
        disciplinaId
      });
      if (data.success) {
        setAiContent(data.data.content);
        setShowAiModal(true);
      }
    } catch {
      alert('Erro ao processar análise da IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiExercises = async () => {
    setAiLoading(true);
    setAiType('EXERCISES');
    try {
      const { data } = await api.post('/ai/pedagogical/exercises', {
        bimester: selectedBimester,
        year,
        disciplinaId
      });
      if (data.success) {
        setAiContent(data.data.exercises || data.data.message);
        setShowAiModal(true);
      }
    } catch {
      alert('Erro ao gerar exercícios de recuperação.');
    } finally {
      setAiLoading(false);
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
            <p className="text-secondary">Acompanhamento Pedagógico & IA Reactor 2.0</p>
          </div>
        </div>
        <div className="header-actions">
           <div className="ai-controls glass-panel" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <select 
               value={selectedBimester} 
               onChange={(e) => setSelectedBimester(Number(e.target.value))}
               className="select-minimal"
             >
               <option value={1}>1º Bimestre</option>
               <option value={2}>2º Bimestre</option>
               <option value={3}>3º Bimestre</option>
               <option value={4}>4º Bimestre</option>
             </select>
             <button className="btn-ai flex-center gap-2" onClick={handleAiAnalysis} disabled={aiLoading}>
               <Brain size={16} /> Insight
             </button>
             <button className="btn-zap flex-center gap-2" onClick={handleAiExercises} disabled={aiLoading}>
               <Zap size={16} /> Recuperação
             </button>
           </div>
           <button className="btn-primary flex-center gap-2" onClick={handleSave} disabled={saving}>
             <Save size={16} /> {saving ? 'Salvar' : 'Salvar Alterações'}
           </button>
        </div>
      </div>

      <div className="dashboard-section fade-in" style={{ animationDelay: '0.1s' }}>
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
                  {[1,2,3,4].map(num => (
                    <td key={num}>
                      <input type="number" step="0.1" min="0" max="10" 
                        value={(b.notas as Record<string, number | null | undefined>)[`bimestre${num}`] ?? ''} 
                        onChange={e => handleGradeChange(b.alunoId, `bimestre${num}` as keyof BoletimEntry['notas'], e.target.value)} 
                      />
                    </td>
                  ))}
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
                    <span className={`badge-status ${b.situacao?.toLowerCase()}`}>
                      {b.situacao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IA REACTOR MODAL */}
      {showAiModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content glass-panel-premium scale-in" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {aiType === 'ANALYSIS' ? <Brain color="#8b5cf6" /> : <Zap color="#f59e0b" />}
                <h2 style={{ margin: 0 }}>
                  {aiType === 'ANALYSIS' ? 'Análise Pedagógica IA' : 'Plano de Recuperação IA'}
                </h2>
              </div>
              <button className="btn-close" onClick={() => setShowAiModal(false)}><X /></button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1.5rem' }}>
              {aiType === 'ANALYSIS' ? (
                <div className="markdown-content">
                  {typeof aiContent === 'string' && <ReactMarkdown>{aiContent}</ReactMarkdown>}
                </div>
              ) : (
                <div className="exercises-list">
                  {typeof aiContent === 'string' ? (
                    <div className="alert-success">{aiContent}</div>
                  ) : (
                    aiContent && aiContent.map((ex, idx) => (
                      <div key={idx} className="exercise-card glass-panel" style={{ marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: '#8b5cf6' }}>Questão {idx + 1}</h4>
                        <p style={{ fontWeight: 500 }}>{ex.question}</p>
                        <div className="options-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                          {ex.options.map((opt: string, i: number) => (
                            <div key={i} className="option-item" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' }}>
                              {opt}
                            </div>
                          ))}
                        </div>
                        <div className="exercise-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                          <small style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CheckCircle size={14} /> Resposta: {ex.correctAnswer}
                          </small>
                          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>{ex.explanation}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-outline" onClick={() => window.print()}>
                <FileText size={16} /> Imprimir Relatório
              </button>
              <button className="btn-primary" onClick={() => setShowAiModal(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {aiLoading && (
        <div className="loading-overlay-ai fade-in">
          <div className="ai-spinner">
            <div className="spinner-ring"></div>
            <Brain className="animate-pulse" size={32} color="#8b5cf6" />
            <p>IA Reactor processando dados pedagógicos...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeManagement;
