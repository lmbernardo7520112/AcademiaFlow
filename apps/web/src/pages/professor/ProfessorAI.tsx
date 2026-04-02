import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Cpu, Send, LineChart as ChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../../styles/dashboard.css';

interface Turma { _id: string; name: string; }
interface Aluno { _id: string; name: string; }
interface Nota { _id: string; bimester: number; value: number; disciplinaId: { name: string } }

export default function ProfessorAIPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedAluno, setSelectedAluno] = useState('');
  const [focoAtividade, setFocoAtividade] = useState('reforco-matematica');

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // AI Response Content
  const [activity, setActivity] = useState<any>(null);
  
  useEffect(() => {
    api.get('/turmas').then(res => {
      if (res.data.success) setTurmas(res.data.data);
    });
  }, []);

  useEffect(() => {
    if (selectedTurma) {
      api.get(`/alunos?turmaId=${selectedTurma}`).then(res => {
        if (res.data.success) setAlunos(res.data.data);
      });
    } else {
      setAlunos([]);
      setSelectedAluno('');
    }
  }, [selectedTurma]);

  useEffect(() => {
    if (selectedAluno) {
      setLoading(true);
      api.get(`/notas?alunoId=${selectedAluno}`).then(res => {
        if (res.data.success) setNotas(res.data.data);
      }).finally(() => setLoading(false));
    } else {
      setNotas([]);
    }
  }, [selectedAluno]);

  const handleGenerate = async () => {
    if (!selectedAluno || !focoAtividade) return;
    setGenerating(true);
    setActivity(null);
    try {
      const { data } = await api.post('/ai/generate-activity', {
        alunoId: selectedAluno,
        focoAtividade,
      });
      if (data.success) {
        setActivity(data.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao comunicar com o motor Gemini.');
    } finally {
      setGenerating(false);
    }
  };

  // Convert notas into Recharts format (aggregate average per bimester, or pick one subject for simplicity)
  // Here we'll just plot a flat timeline of grades
  const chartData = notas.map(n => ({
    name: `${n.bimester}º Bim`,
    Nota: n.value,
    Disciplina: n.disciplinaId?.name || 'Geral'
  })).reverse();

  return (
    <DashboardLayout>
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Cpu size={32} /> AI Reactor
        </h1>
        <p className="text-secondary">Conectado ao Gemini: Geração de atividades pedagógicas direcionadas B2B.</p>
      </div>

      <div className="metrics-grid fade-in" style={{ gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 2fr)' }}>
        
        {/* Painel de Controle */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'hsl(var(--clr-cyan))' }}>Câmara de Combustão</h3>
          
          <div className="input-group">
            <label>Selecione a Turma</label>
            <select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}>
              <option value="">-- Selecione --</option>
              {turmas.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Aluno Alvo</label>
            <select value={selectedAluno} onChange={e => setSelectedAluno(e.target.value)} disabled={!selectedTurma}>
              <option value="">-- Selecione --</option>
              {alunos.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Foco Pedagógico</label>
            <input 
              value={focoAtividade} 
              onChange={e => setFocoAtividade(e.target.value)} 
              placeholder="Ex: Reforço em Frações" 
              disabled={!selectedAluno} 
            />
          </div>

          <button 
            className="btn-primary flex-center gap-2" 
            onClick={handleGenerate} 
            disabled={!selectedAluno || !focoAtividade || generating}
            style={{ marginTop: 'auto', background: 'linear-gradient(45deg, hsl(320, 80%, 55%), hsl(250, 80%, 55%))', border: 'none' }}
          >
            {generating ? <span className="loader" style={{ width: '16px', height: '16px', border: '2px solid #fff', borderBottomColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'rotation 1s linear infinite' }} /> : <Send size={18} />}
            {generating ? 'Sintetizando...' : 'Gerar Materiais via IA'}
          </button>
        </div>

        {/* Painel de Contexto (Gráfico) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ChartIcon size={18} /> Telemetria de Desempenho
          </h3>
          
          <div style={{ flex: 1, minHeight: '250px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem' }}>
            {!selectedAluno ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Selecione um aluno para rastrear dados.</div>
            ) : loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>Analisando...</div>
            ) : notas.length === 0 ? (
               <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Aluno sem registros de notas no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis domain={[0, 10]} stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Line type="monotone" dataKey="Nota" stroke="hsl(var(--clr-cyan))" strokeWidth={3} dot={{ fill: 'hsl(var(--clr-cyan))', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* RESULTADO GERADO */}
      {activity && (
        <div className="glass-panel fade-in slide-in-bottom" style={{ marginTop: '2rem', border: '1px solid hsl(var(--clr-cyan))' }}>
          <h2 style={{ color: 'hsl(var(--clr-cyan))', margin: '0 0 1rem 0' }}>{activity.tituloDaAtividade}</h2>
          
          <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <h4 style={{ color: '#aaa', margin: '0 0 0.5rem 0' }}>Sintese Diagnóstica</h4>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{activity.resumoPedagogico}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {activity.questoes.map((q: any, i: number) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-primary)' }}>{q.titulo}</h4>
                <p style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>{q.enunciado}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {q.alternativas.map((alt: string, idx: number) => (
                    <li key={idx} style={{ padding: '0.5rem', borderRadius: '6px', background: idx === q.correta ? 'rgba(0, 255, 100, 0.1)' : 'rgba(255,255,255,0.02)', border: idx === q.correta ? '1px solid rgba(0, 255, 100, 0.3)' : '1px solid transparent', color: idx === q.correta ? '#4ade80' : '#ccc' }}>
                      {String.fromCharCode(65 + idx)}. {alt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
