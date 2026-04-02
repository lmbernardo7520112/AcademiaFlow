import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import '../../styles/dashboard.css';

interface Disciplina {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchDisciplinas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/disciplinas');
      if (data.success) setDisciplinas(data.data);
    } catch (error) {
      console.error('Erro ao buscar disciplinas', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisciplinas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, description: description || undefined, isActive };
      if (editingId) {
        await api.put(`/disciplinas/${editingId}`, payload);
      } else {
        await api.post('/disciplinas', payload);
      }
      setIsModalOpen(false);
      fetchDisciplinas();
    } catch (error) {
      alert('Erro ao salvar disciplina. Verifique os dados.');
      console.error(error);
    }
  };

  const handleEdit = (disciplina: Disciplina) => {
    setEditingId(disciplina._id);
    setName(disciplina.name);
    setDescription(disciplina.description || '');
    setIsActive(disciplina.isActive);
    setIsModalOpen(true);
  };

  const openNewForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', title: 'Nome da Disciplina' },
    { key: 'description', title: 'Ementa / Descrição', render: (row: Disciplina) => row.description || '-' },
    { 
      key: 'isActive', 
      title: 'Status', 
      render: (row: Disciplina) => (
        <span className={`status-pill ${row.isActive ? 'active' : ''}`}>
          {row.isActive ? 'Operante' : 'Inativa'}
        </span>
      ) 
    },
    {
      key: 'actions',
      title: 'Ações',
      render: (row: Disciplina) => (
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
        <h1 className="text-gradient">Gestão de Disciplinas</h1>
        <p className="text-secondary">Catálogo curricular e controle de matérias B2B.</p>
      </div>

      <div className="dashboard-section fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="section-header">
          <h2>Disciplinas Cadastradas</h2>
          <button className="btn-primary flex-center gap-2" onClick={openNewForm}>
            <Plus size={16} /> Nova Disciplina
          </button>
        </div>
        
        <DataTable data={disciplinas} columns={columns} loading={loading} emptyText="Nenhuma disciplina configurada." />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Disciplina' : 'Criar Nova Disciplina'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label>Nome da Disciplina</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Matemática Avançada" />
          </div>
          <div className="input-group">
            <label>Descrição Opcional</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ementa resumida..." rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', backgroundColor: 'transparent', color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="isActive" style={{ margin: 0 }}>Matéria Ativa no Semestre</label>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-outline-small" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? 'Salvar Mudanças' : 'Cadastrar Disciplina'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
