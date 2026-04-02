import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import '../../styles/dashboard.css';

interface Turma {
  _id: string;
  name: string;
}

interface Aluno {
  _id: string;
  name: string;
  matricula: string;
  email?: string;
  turmaId: Turma;
  dataNascimento: string;
  isActive: boolean;
}

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [valorMensalidade, setValorMensalidade] = useState(0);
  const [vencimentoDia, setVencimentoDia] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alunosRes, turmasRes] = await Promise.all([
        api.get('/alunos'),
        api.get('/turmas')
      ]);
      if (alunosRes.data.success) setAlunos(alunosRes.data.data);
      if (turmasRes.data.success) {
         setTurmas(turmasRes.data.data);
         if (turmasRes.data.data.length > 0 && !turmaId) {
             setTurmaId(turmasRes.data.data[0]._id);
         }
      }
    } catch (error) {
      console.error('Erro ao buscar dados', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        name, 
        email: email || undefined, 
        matricula, 
        turmaId, 
        dataNascimento, 
        isActive,
        valorMensalidade,
        vencimentoDia
      };
      
      if (editingId) {
        await api.put(`/alunos/${editingId}`, payload);
      } else {
        await api.post('/alunos', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao salvar aluno. Verifique os dados.');
      console.error(error);
    }
  };

  const handleEdit = (aluno: any) => {
    setEditingId(aluno._id);
    setName(aluno.name);
    setEmail(aluno.email || '');
    setMatricula(aluno.matricula);
    setTurmaId(aluno.turmaId._id ? aluno.turmaId._id : (aluno.turmaId as unknown as string));
    setDataNascimento(new Date(aluno.dataNascimento).toISOString().split('T')[0]);
    setIsActive(aluno.isActive);
    setValorMensalidade(aluno.valorMensalidade || 0);
    setVencimentoDia(aluno.vencimentoDia || 10);
    setIsModalOpen(true);
  };

  const openNewForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setMatricula('');
    if (turmas.length > 0) setTurmaId(turmas[0]._id);
    setDataNascimento('');
    setIsActive(true);
    setValorMensalidade(0);
    setVencimentoDia(10);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'matricula', title: 'Matrícula' },
    { key: 'name', title: 'Nome do Aluno' },
    { 
      key: 'turma', 
      title: 'Turma', 
      render: (row: any) => row.turmaId?.name || 'Desconhecida' 
    },
    {
      key: 'financeiro',
      title: 'Mensalidade',
      render: (row: any) => `R$ ${row.valorMensalidade || 0}`
    },
    { 
      key: 'isActive', 
      title: 'Status', 
      render: (row: any) => (
        <span className={`status-pill ${row.isActive ? 'active' : ''}`}>
          {row.isActive ? 'Matriculado' : 'Inativo'}
        </span>
      ) 
    },
    {
      key: 'actions',
      title: 'Ações',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-outline-small" onClick={() => handleEdit(row)} title="Editar"><Edit2 size={14} /></button>
          <button className="btn-outline-small" onClick={() => alert('Para excluir/desativar acesse a edição.')} title="Excluir"><Trash2 size={14} color="hsl(345, 80%, 55%)" /></button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient">Gestão de Alunos</h1>
        <p className="text-secondary">Cadastro e alocação de estudantes.</p>
      </div>

      <div className="dashboard-section fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <h2>Alunos Registrados</h2>
          <button className="btn-primary flex-center gap-2" onClick={openNewForm}>
            <Plus size={16} /> Novo Aluno
          </button>
        </div>
        
        <div className="glass-panel" style={{ padding: 0 }}>
          <DataTable data={alunos} columns={columns} loading={loading} emptyText="Nenhum aluno encontrado." />
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Aluno' : 'Cadastrar Aluno'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Matrícula</label>
              <input required value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: MAT-2025" disabled={!!editingId} />
            </div>

            <div className="input-group">
              <label>Nome Completo</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do Aluno" />
            </div>
          </div>
          
          <div className="input-group">
            <label>E-mail (Opcional)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aluno@escola.com" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Turma</label>
              <select required value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                {turmas.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Data de Nascimento</label>
              <input type="date" required value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
            </div>
          </div>

          <div className="section-divider" style={{ margin: '1rem 0', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Mensalidade (R$)</label>
              <input type="number" step="0.01" value={valorMensalidade} onChange={(e) => setValorMensalidade(parseFloat(e.target.value))} />
            </div>

            <div className="input-group">
              <label>Dia Vencimento</label>
              <input type="number" min="1" max="28" value={vencimentoDia} onChange={(e) => setVencimentoDia(parseInt(e.target.value))} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="isActive" style={{ margin: 0 }}>Matrícula Ativa</label>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-outline-small" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? 'Atualizar Aluno' : 'Cadastrar'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
