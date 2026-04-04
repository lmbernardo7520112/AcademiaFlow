import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import DashboardLayout from '../../components/layout/DashboardLayout.js';
import DataTable from '../../components/ui/DataTable.js';
import Modal from '../../components/ui/Modal.js';
import { Plus, Edit2, FileText, ChevronLeft } from 'lucide-react';
import { TurmaGrid } from '../../components/dashboard/TurmaGrid.js';
import '../../styles/dashboard.css';

interface Turma {
  _id: string;
  name: string;
  year: number;
  periodo: string;
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
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null);
  const [selectedTurmaName, setSelectedTurmaName] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alunosRes, turmasRes] = await Promise.all([
        api.get('/alunos'),
        api.get('/turmas')
      ]);
      if (alunosRes.data.success) {
        setAlunos(alunosRes.data.data);
      }
      if (turmasRes.data.success) {
        setTurmas(turmasRes.data.data);
      }
    } catch {
      console.error('Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAlunos = selectedTurmaId 
    ? alunos.filter(a => (a.turmaId as any)?._id === selectedTurmaId)
    : [];

  const handleSelectTurma = (id: string, name: string) => {
    setSelectedTurmaId(id);
    setSelectedTurmaName(name);
    setTurmaId(id); // Set default for modal registration
  };

  const handleBack = () => {
    setSelectedTurmaId(null);
    setSelectedTurmaName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        name, 
        email: email || undefined, 
        matricula, 
        turmaId, 
        dataNascimento, 
        isActive
      };
      
      if (editingId) {
        await api.put(`/alunos/${editingId}`, payload);
      } else {
        await api.post('/alunos', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar aluno.';
      alert(errorMessage);
    }
  };

  const handleEdit = (aluno: Aluno) => {
    setEditingId(aluno._id);
    setName(aluno.name);
    setEmail(aluno.email || '');
    setMatricula(aluno.matricula);
    setTurmaId((aluno.turmaId as any)._id || (aluno.turmaId as any));
    setDataNascimento(new Date(aluno.dataNascimento).toISOString().split('T')[0]);
    setIsActive(aluno.isActive);
    setIsModalOpen(true);
  };

  const openNewForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setMatricula('');
    // Manter turmaId se já estiver filtrado
    setDataNascimento('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'matricula', title: 'Matrícula' },
    { key: 'name', title: 'Nome do Aluno' },
    { 
      key: 'isActive', 
      title: 'Status', 
      render: (row: Aluno) => (
        <span className={`status-pill ${row.isActive ? 'active' : ''}`}>
          {row.isActive ? 'Matriculado' : 'Inativo'}
        </span>
      ) 
    },
    {
      key: 'actions',
      title: 'Ações',
      render: (row: Aluno) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn-outline-small" onClick={() => handleEdit(row)} title="Editar"><Edit2 size={14} /></button>
          <button className="btn-outline-small" onClick={() => window.location.href = `/dashboard/alunos/${row._id}/boletim`} title="Boletim Individual"><FileText size={14} color="#3b82f6" /></button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient">Gestão de Alunos</h1>
        <p className="text-secondary">Ponto de centralização discente e paridade funcional.</p>
      </div>

      {!selectedTurmaId ? (
        <div className="dashboard-section fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="section-header" style={{ marginBottom: '1.5rem' }}>
            <h2>Selecione uma Turma</h2>
          </div>
          <TurmaGrid turmas={turmas} onSelect={handleSelectTurma} />
        </div>
      ) : (
        <div className="dashboard-section fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={handleBack}
                className="btn-outline-small flex-center"
                style={{ padding: '0.5rem', borderRadius: '50%' }}
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 style={{ margin: 0 }}>Alunos: {selectedTurmaName}</h2>
                <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Visualizando registros acadêmicos ativos.</p>
              </div>
            </div>
            <button className="btn-primary flex-center gap-2" onClick={openNewForm}>
              <Plus size={16} /> Novo Aluno
            </button>
          </div>
          
          <div className="glass-panel" style={{ padding: 0 }}>
            <DataTable data={filteredAlunos} columns={columns} loading={loading} emptyText="Nenhum aluno encontrado nesta turma." />
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Registro' : 'Cadastro Forense de Aluno'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Matrícula</label>
              <input required value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: MAT-2025" disabled={!!editingId} />
            </div>

            <div className="input-group">
              <label>Nome Completo</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Conforme documento" />
            </div>
          </div>
          
          <div className="input-group">
            <label>E-mail Institucional</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aluno@escola.com" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Turma Designada</label>
              <select required value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                <option value="">Selecione...</option>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="isActive" style={{ margin: 0 }}>Matrícula Ativa (Vínculo Mantido)</label>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-outline-small" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? 'Efetivar Mudanças' : 'Cadastrar Aluno'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
