import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import DashboardLayout from '../../components/layout/DashboardLayout.js';
import DataTable from '../../components/ui/DataTable.js';
import Modal from '../../components/ui/Modal.js';
import { Plus, Edit2, BookOpen } from 'lucide-react';
import '../../styles/dashboard.css';

interface Disciplina {
  _id: string;
  name: string;
  codigo: string;
  professorId?: { _id: string; name: string };
  turmaIds: Array<{ _id: string; name: string }>;
  isActive: boolean;
}

interface Professor {
  _id: string;
  name: string;
}

interface Turma {
  _id: string;
  name: string;
}

export default function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [codigo, setCodigo] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [selectedTurmaIds, setSelectedTurmaIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [discRes, profRes, turmasRes] = await Promise.all([
        api.get('/disciplinas'),
        api.get('/users/professores'), // Ajustar se rota for diferente
        api.get('/turmas')
      ]);
      
      if (discRes.data.success) setDisciplinas(discRes.data.data);
      if (profRes.data.success) setProfessores(profRes.data.data);
      if (turmasRes.data.success) setTurmas(turmasRes.data.data);
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
        codigo, 
        professorId: professorId || null, 
        turmaIds: selectedTurmaIds,
        isActive 
      };
      
      if (editingId) {
        await api.put(`/disciplinas/${editingId}`, payload);
      } else {
        await api.post('/disciplinas', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Erro ao salvar disciplina. Verifique o padrão do código (ex: MAT-001).');
      console.error(error);
    }
  };

  const handleEdit = (disciplina: Disciplina) => {
    setEditingId(disciplina._id);
    setName(disciplina.name);
    setCodigo(disciplina.codigo);
    setProfessorId(disciplina.professorId?._id || '');
    setSelectedTurmaIds(disciplina.turmaIds.map(t => t._id));
    setIsActive(disciplina.isActive);
    setIsModalOpen(true);
  };

  const openNewForm = () => {
    setEditingId(null);
    setName('');
    setCodigo('');
    setProfessorId('');
    setSelectedTurmaIds([]);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const columns = [
    { 
      key: 'name', 
      title: 'Nome da Disciplina',
      render: (row: Disciplina) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 'bold' }}>{row.name}</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{row.codigo}</span>
        </div>
      )
    },
    { 
      key: 'professor', 
      title: 'Docente Responsável', 
      render: (row: Disciplina) => row.professorId?.name || <span className="text-secondary">Não atribuído</span> 
    },
    { 
      key: 'turmas', 
      title: 'Turmas Vinculadas', 
      render: (row: Disciplina) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {Array.isArray(row.turmaIds) && row.turmaIds.length > 0 ? row.turmaIds.map(t => (
            <span key={t?._id || Math.random().toString()} className="status-pill" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderColor: 'transparent' }}>
              {t?.name || 'Inexistente'}
            </span>
          )) : <span className="text-secondary">-</span>}
        </div>
      )
    },
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
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient">Gestão Curricular</h1>
        <p className="text-secondary">Administração de disciplinas, docentes e alocação de turmas.</p>
      </div>

      <div className="dashboard-section fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="flex-center" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <BookOpen size={18} />
            </div>
            <h2 style={{ margin: 0 }}>Grade Ativa</h2>
          </div>
          <button className="btn-primary flex-center gap-2" onClick={openNewForm}>
            <Plus size={16} /> Nova Matéria
          </button>
        </div>
        
        <div className="glass-panel" style={{ padding: 0 }}>
          <DataTable data={disciplinas} columns={columns} loading={loading} emptyText="Aguardando carga de dados da secretaria." />
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Refinar Disciplina' : 'Nova Carga Disciplinar'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="input-group">
              <label htmlFor="codigo">Código (Paridade)</label>
              <input id="codigo" required value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: MAT-001" />
            </div>
            <div className="input-group">
              <label htmlFor="name">Nome da Disciplina</label>
              <input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Biologia Molecular" />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="professorId">Docente Responsável</label>
            <select id="professorId" value={professorId} onChange={(e) => setProfessorId(e.target.value)}>
              <option value="">Nenhum/Aguardando Atribuição</option>
              {professores.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Vínculo com Turmas (Seleção Múltipla)</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: '0.5rem',
              maxHeight: '150px',
              overflowY: 'auto',
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px'
            }}>
              {turmas.map(t => (
                <label key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedTurmaIds.includes(t._id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTurmaIds([...selectedTurmaIds, t._id]);
                      else setSelectedTurmaIds(selectedTurmaIds.filter(id => id !== t._id));
                    }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="isActive" style={{ margin: 0 }}>Disciplina Ativa (Visível para Professores)</label>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-outline-small" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? 'Atualizar Grade' : 'Efetivar Carga'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
