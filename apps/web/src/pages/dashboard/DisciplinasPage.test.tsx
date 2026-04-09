import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DisciplinasPage from './DisciplinasPage';
import { api } from '../../services/api';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Tipagem para o mock do DataTable
interface Column {
  key: string;
  title: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

// Mock do DataTable
vi.mock('../../components/ui/DataTable', () => ({
  default: ({ data, columns, loading }: { data: Record<string, unknown>[], columns: Column[], loading: boolean }) => {
    if (loading) return <div>Loading...</div>;
    return (
      <table>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key}>{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {(data || []).map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(row) : (row[c.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

const mockDisciplinas = [
  {
    _id: 'd1',
    name: 'Matemática',
    codigo: 'MAT-001',
    professorId: { _id: 'p1', name: 'Professor Girafales' },
    turmaIds: [
      { _id: 't1', name: 'Turma A' },
      { _id: 't2', name: 'Turma B' },
    ],
    isActive: true,
  },
  {
    _id: 'd2',
    name: 'Português',
    codigo: 'POR-002',
    professorId: null,
    turmaIds: [],
    isActive: false,
  },
];

const mockProfessores = [
  { _id: 'p1', name: 'Professor Girafales' },
];

const mockTurmas = [
  { _id: 't1', name: 'Turma A' },
  { _id: 't2', name: 'Turma B' },
];

describe('DisciplinasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar a lista de disciplinas e mostrar turmas vinculadas (1:N)', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/disciplinas') return Promise.resolve({ data: { success: true, data: mockDisciplinas } });
      if (url === '/users/professores') return Promise.resolve({ data: { success: true, data: mockProfessores } });
      if (url === '/turmas') return Promise.resolve({ data: { success: true, data: mockTurmas } });
      return Promise.reject(new Error('URL não encontrada'));
    });

    render(
      <BrowserRouter>
        <DisciplinasPage />
      </BrowserRouter>
    );

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText('Matemática')).toBeInTheDocument();
      expect(screen.getByText('MAT-001')).toBeInTheDocument();
    });

    // Verifica 1:N renderizado (Turma A e Turma B vinculadas a Matemática)
    expect(screen.getByText('Turma A')).toBeInTheDocument();
    expect(screen.getByText('Turma B')).toBeInTheDocument();

    // Disciplina sem turma (Português)
    expect(screen.getByText('Português')).toBeInTheDocument();
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('deve abrir o modal para nova carga disciplinar', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } });

    render(
      <BrowserRouter>
        <DisciplinasPage />
      </BrowserRouter>
    );

    const btnNew = screen.getByText(/Nova Matéria/i);
    fireEvent.click(btnNew);

    expect(screen.getByText(/Nova Carga Disciplinar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome da Disciplina/i)).toBeInTheDocument();
  });
});
