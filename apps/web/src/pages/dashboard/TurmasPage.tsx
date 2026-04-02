import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Plus, Edit2, Trash2, Download } from 'lucide-react';
import '../../styles/dashboard.css';

interface Turma {
  _id: string;
  name: string;
  year: number;
  periodo: string;
  isActive: boolean;
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [periodo, setPeriodo] = useState('matutino');
  const [isActive, setIsActive] = useState(true);

  const fetchTurmas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/turmas');
      if (data.success) setTurmas(data.data);
    } catch (error) {
      console.error('Erro ao buscar turmas', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurmas();
  }, []);

  const handleExport = async (turmaId: string, turmaName: string) => {
    try {
      // Usando query params baseados no backend
      const response = await api.get(`/reports/turmas/${turmaId}/boletins/export?year=${year}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Boletins_${turmaName.replace(/\s+/g, '_')}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Erro ao exportar relatório. Verifique se existem notas cadastradas.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, year: Number(year), periodo, isActive };
      if (editingId) {
        await api.put(`/turmas/${editingId}`, payload);
      } else {
        await api.post('/turmas', payload);
      }
      setIsModalOpen(false);
      fetchTurmas();
    } catch (error) {
      alert('Erro ao salvar turma. Verifique os dados.');
      console.error(error);
    }
  };

  const handleEdit = (turma: Turma) => {
    setEditingId(turma._id);
    setName(turma.name);
    setYear(turma.year);
    setPeriodo(turma.periodo);
    setIsActive(turma.isActive);
    setIsModalOpen(true);
  };

  const openNewForm = () => {
    setEditingId(null);
    setName('');
    setYear(new Date().getFullYear());
    setPeriodo('matutino');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', title: 'Nome da Turma' },
    { key: 'year', title: 'Ano Letivo' },
    { key: 'periodo', title: 'Período', render: (row: Turma) => <span style={{ textTransform: 'capitalize' }}>{row.periodo}</span> },
    { 
      key: 'isActive', 
      title: 'Status', 
      render: (row: Turma) => (
        <span className={`status-pill ${row.isActive ? 'active' : ''}`}>
          {row.isActive ? 'Operante' : 'Inativo'}
        </span>
      ) 
    },
    {
      key: 'actions',
      title: 'Ações',
      render: (row: Turma) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-outline-small" onClick={() => handleExport(row._id, row.name)} title="Exportar Boletins"><Download size={14} color="#10b981" /></button>
          <button className="btn-outline-small" onClick={() => handleEdit(row)} title="Editar"><Edit2 size={14} /></button>
          <button className="btn-outline-small" onClick={() => alert('Para excluir/desativar acesse a edição.')} title="Excluir"><Trash2 size={14} color="hsl(345, 80%, 55%)" /></button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient">Gestão de Turmas</h1>
        <p className="text-secondary">Administração de núcleos de aprendizagem B2B.</p>
      </div>

      <div className="dashboard-section fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <h2>Suas Turmas</h2>
          <button className="btn-primary flex-center gap-2" onClick={openNewForm}>
            <Plus size={16} /> Nova Turma
          </button>
        </div>
        
        <div className="glass-panel" style={{ padding: 0 }}>
          <DataTable data={turmas} columns={columns} loading={loading} emptyText="Nenhuma turma cadastrada." />
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Turma' : 'Criar Nova Turma'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label>Nome da Turma</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: 3º Ano B" />
          </div>
          <div className="input-group">
            <label>Ano Letivo</label>
            <input type="number" required value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div className="input-group">
            <label>Período</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="isActive" style={{ margin: 0 }}>Turma Ativa (Operante)</label>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-outline-small" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? 'Salvar Mudanças' : 'Criar Turma'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
