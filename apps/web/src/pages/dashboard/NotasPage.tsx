import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Save } from 'lucide-react';
import '../../styles/dashboard.css';

interface Turma { _id: string; name: string; }
interface Disciplina { _id: string; name: string; }
interface Aluno { _id: string; name: string; matricula: string; }

export default function NotasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  
  // Selection State
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [bimester, setBimester] = useState(1);
  
  // Grading State
  const [grades, setGrades] = useState<{ [alunoId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSelectData = async () => {
      setLoading(true);
      try {
        const [turmasRes, discRes] = await Promise.all([
          api.get('/turmas'),
          api.get('/disciplinas')
        ]);
        if (turmasRes.data.success) setTurmas(turmasRes.data.data);
        if (discRes.data.success) setDisciplinas(discRes.data.data);
      } catch (error) {
        console.error('Erro ao carregar selects', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSelectData();
  }, []);

  useEffect(() => {
    if (selectedTurma) {
      api.get(`/alunos?turmaId=${selectedTurma}`).then(res => {
        if (res.data.success) {
          setAlunos(res.data.data);
        }
      });
    } else {
      setAlunos([]);
    }
  }, [selectedTurma]);

  const handleGradeChange = (alunoId: string, value: string) => {
    setGrades(prev => ({ ...prev, [alunoId]: value }));
  };

  const handleBulkSubmit = async () => {
    if (!selectedTurma || !selectedDisciplina) {
      alert('Selecione turma e disciplina primeiro.');
      return;
    }

    const payload = Object.entries(grades)
      .filter(([_, val]) => val.trim() !== '')
      .map(([alunoId, value]) => ({
        alunoId,
        disciplinaId: selectedDisciplina,
        turmaId: selectedTurma,
        year: Number(year),
        bimester: Number(bimester),
        value: Number(value)
      }));

    if (payload.length === 0) {
      alert('Nenhuma nota preenchida para envio.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post('/notas/bulk', payload);
      alert(`Lançamento realizado com sucesso: ${data.data?.insertedCount || payload.length} notas processadas.`);
      setGrades({}); // limpa formulário
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no envio das notas.';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient">Lançamento de Notas</h1>
        <p className="text-secondary">Processamento em lote ágil (Bulk Actions) para resultados de bimestres.</p>
      </div>

      <div className="dashboard-section fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          
          <div className="input-group">
            <label>Turma</label>
            <select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}>
              <option value="">-- Selecione --</option>
              {turmas.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Disciplina</label>
            <select value={selectedDisciplina} onChange={e => setSelectedDisciplina(e.target.value)}>
              <option value="">-- Selecione --</option>
              {disciplinas.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Bimestre</label>
            <select value={bimester} onChange={e => setBimester(Number(e.target.value))}>
              {[1,2,3,4].map(b => <option key={b} value={b}>{b}º Bimestre</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Ano Letivo</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2030} />
          </div>

        </div>

        {selectedTurma && selectedDisciplina ? (
          <div className="glass-panel" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Matrícula</th>
                  <th style={{ width: '60%' }}>Nome do Aluno</th>
                  <th style={{ width: '25%' }}>Nota (0.0 - 10.0)</th>
                </tr>
              </thead>
              <tbody>
                {alunos.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum aluno nesta turma.</td></tr>
                ) : (
                  alunos.map(aluno => (
                    <tr key={aluno._id}>
                      <td>{aluno.matricula}</td>
                      <td>{aluno.name}</td>
                      <td>
                        <input 
                          type="number" 
                          min="0" max="10" step="0.1"
                          placeholder="Ex: 8.5"
                          value={grades[aluno._id] || ''}
                          onChange={(e) => handleGradeChange(aluno._id, e.target.value)}
                          style={{ width: '100px' }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button className="btn-primary flex-center gap-2" onClick={handleBulkSubmit} disabled={saving || alunos.length === 0}>
                <Save size={16} /> {saving ? 'Processando...' : 'Salvar Diário B2B'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            {loading ? 'Carregando dados...' : 'Selecione uma Turma e uma Disciplina para iniciar a digitação de notas.'}
          </div>
        )}
      </div>
    </>
  );
}
